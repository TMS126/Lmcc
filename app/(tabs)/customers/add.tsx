import { View, ScrollView, KeyboardAvoidingView, Platform } from 'react-native'
import { Text, TextInput, Button, Switch, HelperText, Divider } from 'react-native-paper'
import { useState } from 'react'
import { router } from 'expo-router'
import { useForm, Controller } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { getDB } from '@/src/db/database'
import 'react-native-get-random-values'
import { v4 as uuidv4 } from 'uuid'

const schema = z.object({
  full_name:     z.string().min(2, 'Name must be at least 2 characters'),
  phone_number:  z.string().min(10, 'Enter a valid phone number').max(15).optional().or(z.literal('')),
  id_number:     z.string().length(13, 'SA ID must be 13 digits').optional().or(z.literal('')),
  address:       z.string().optional(),
  notes:         z.string().optional(),
  sms_receipts:  z.boolean(),
})

type FormData = z.infer<typeof schema>

export default function AddCustomerScreen() {
  const [saving, setSaving] = useState(false)
  const [showMore, setShowMore] = useState(false)

  const { control, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      full_name: '',
      phone_number: '',
      id_number: '',
      address: '',
      notes: '',
      sms_receipts: true,
    }
  })

  const onSubmit = async (data: FormData) => {
    setSaving(true)
    try {
      const db = await getDB()
      const id = uuidv4()
      await db.runAsync(
        `INSERT INTO customers (id, full_name, phone_number, id_number, address, notes, sms_receipts)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          data.full_name.trim(),
          data.phone_number?.trim() || null,
          data.id_number?.trim() || null,
          data.address?.trim() || null,
          data.notes?.trim() || null,
          data.sms_receipts ? 1 : 0,
        ]
      )
      await db.runAsync(
        `INSERT INTO audit_log (action, entity_type, entity_id, details) VALUES ('CREATE', 'customer', ?, ?)`,
        [id, `Customer added: ${data.full_name}`]
      )
      router.back()
    } catch (e) {
      console.error(e)
    } finally {
      setSaving(false)
    }
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="flex-1"
    >
      <ScrollView className="flex-1 bg-background" contentContainerStyle={{ padding: 16, paddingBottom: 60 }}>

        <Text variant="headlineSmall" className="font-bold mb-1">New Customer</Text>
        <Text variant="bodySmall" className="opacity-50 mb-6">Fill in the basics — you can always edit later.</Text>

        {/* Required fields */}
        <Controller
          control={control} name="full_name"
          render={({ field: { onChange, value } }) => (
            <TextInput
              label="Full Name *"
              value={value}
              onChangeText={onChange}
              mode="outlined"
              autoCapitalize="words"
              error={!!errors.full_name}
              className="mb-1"
            />
          )}
        />
        <HelperText type="error" visible={!!errors.full_name}>{errors.full_name?.message}</HelperText>

        <Controller
          control={control} name="phone_number"
          render={({ field: { onChange, value } }) => (
            <TextInput
              label="Phone Number"
              value={value}
              onChangeText={onChange}
              mode="outlined"
              keyboardType="phone-pad"
              error={!!errors.phone_number}
              className="mb-1"
            />
          )}
        />
        <HelperText type="error" visible={!!errors.phone_number}>{errors.phone_number?.message}</HelperText>

        {/* Expandable extra details */}
        <Button
          mode="text"
          onPress={() => setShowMore(!showMore)}
          icon={showMore ? 'chevron-up' : 'chevron-down'}
          className="self-start mb-2"
        >
          {showMore ? 'Hide extra details' : 'Add more details'}
        </Button>

        {showMore && (
          <View className="gap-2">
            <Controller
              control={control} name="id_number"
              render={({ field: { onChange, value } }) => (
                <TextInput
                  label="SA ID Number"
                  value={value}
                  onChangeText={onChange}
                  mode="outlined"
                  keyboardType="number-pad"
                  maxLength={13}
                  error={!!errors.id_number}
                />
              )}
            />
            <HelperText type="error" visible={!!errors.id_number}>{errors.id_number?.message}</HelperText>

            <Controller
              control={control} name="address"
              render={({ field: { onChange, value } }) => (
                <TextInput
                  label="Address"
                  value={value}
                  onChangeText={onChange}
                  mode="outlined"
                  multiline
                  numberOfLines={2}
                />
              )}
            />

            <Controller
              control={control} name="notes"
              render={({ field: { onChange, value } }) => (
                <TextInput
                  label="Notes"
                  value={value}
                  onChangeText={onChange}
                  mode="outlined"
                  multiline
                  numberOfLines={3}
                  placeholder="e.g. Works at Shoprite, lives near taxi rank"
                />
              )}
            />
          </View>
        )}

        <Divider className="my-4" />

        {/* SMS toggle */}
        <View className="flex-row items-center justify-between py-2">
          <View className="flex-1 mr-4">
            <Text variant="bodyMedium" className="font-medium">SMS Receipts</Text>
            <Text variant="bodySmall" className="opacity-50">Send payment receipts via SMS</Text>
          </View>
          <Controller
            control={control} name="sms_receipts"
            render={({ field: { onChange, value } }) => (
              <Switch value={value} onValueChange={onChange} />
            )}
          />
        </View>

        <Divider className="mb-6" />

        <Button
          mode="contained"
          onPress={handleSubmit(onSubmit)}
          loading={saving}
          disabled={saving}
          contentStyle={{ paddingVertical: 6 }}
          className="rounded-xl"
        >
          Save Customer
        </Button>

        <Button
          mode="text"
          onPress={() => router.back()}
          className="mt-2"
        >
          Cancel
        </Button>

      </ScrollView>
    </KeyboardAvoidingView>
  )
}
