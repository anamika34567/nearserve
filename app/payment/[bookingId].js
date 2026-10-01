import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  StatusBar,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { updateBookingPayment } from '../../services/bookingService';
import { COLORS, PAYMENT_STATUS, PAYMENT_METHODS } from '../../constants';

export default function PaymentScreen() {
  const { bookingId, amount, providerName } = useLocalSearchParams();
  const router = useRouter();
  const [selectedMethod, setSelectedMethod] = useState(null);
  const [processing, setProcessing] = useState(false);

  const paymentMethods = [
    {
      key: PAYMENT_METHODS.CASH,
      label: 'Cash on Service',
      icon: 'cash-outline',
      color: COLORS.success,
      desc: 'Pay the provider directly in cash',
    },
    {
      key: PAYMENT_METHODS.ONLINE,
      label: 'Online Payment',
      icon: 'card-outline',
      color: COLORS.primary,
      desc: 'UPI / Card / Net Banking (Mock)',
    },
  ];

  const handlePay = async () => {
    if (!selectedMethod) {
      Alert.alert('Select Method', 'Please select a payment method');
      return;
    }

    setProcessing(true);
    try {
      // Simulate payment processing
      await new Promise((resolve) => setTimeout(resolve, 1500));

      await updateBookingPayment(bookingId, PAYMENT_STATUS.PAID, selectedMethod);

      Alert.alert(
        'Payment Successful!',
        selectedMethod === PAYMENT_METHODS.CASH
          ? 'Please pay the provider when they arrive.'
          : 'Your online payment has been processed.',
        [{ text: 'Done', onPress: () => router.back() }]
      );
    } catch (error) {
      Alert.alert('Error', 'Payment failed. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />

      {/* Amount Card */}
      <View style={styles.amountCard}>
        <Text style={styles.amountLabel}>Amount to Pay</Text>
        <Text style={styles.amountValue}>Rs.{amount || 0}</Text>
        <Text style={styles.amountSub}>for {providerName || 'Service'}</Text>
      </View>

      {/* Payment Methods */}
      <Text style={styles.sectionTitle}>Select Payment Method</Text>

      {paymentMethods.map((method) => (
        <TouchableOpacity
          key={method.key}
          style={[
            styles.methodCard,
            selectedMethod === method.key && styles.methodCardSelected,
            selectedMethod === method.key && { borderColor: method.color },
          ]}
          onPress={() => setSelectedMethod(method.key)}
          activeOpacity={0.7}
        >
          <View style={[styles.methodIcon, { backgroundColor: method.color + '15' }]}>
            <Ionicons name={method.icon} size={24} color={method.color} />
          </View>
          <View style={styles.methodInfo}>
            <Text style={styles.methodLabel}>{method.label}</Text>
            <Text style={styles.methodDesc}>{method.desc}</Text>
          </View>
          <View style={[
            styles.radio,
            selectedMethod === method.key && { borderColor: method.color },
          ]}>
            {selectedMethod === method.key && (
              <View style={[styles.radioInner, { backgroundColor: method.color }]} />
            )}
          </View>
        </TouchableOpacity>
      ))}

      {/* Pay Button */}
      <TouchableOpacity
        style={[styles.payBtn, !selectedMethod && styles.payBtnDisabled]}
        onPress={handlePay}
        disabled={!selectedMethod || processing}
      >
        {processing ? (
          <ActivityIndicator color={COLORS.white} />
        ) : (
          <>
            <Ionicons name="shield-checkmark" size={20} color={COLORS.white} />
            <Text style={styles.payBtnText}>
              {selectedMethod === PAYMENT_METHODS.CASH ? 'Confirm Cash Payment' : 'Pay Rs.' + (amount || 0)}
            </Text>
          </>
        )}
      </TouchableOpacity>

      {/* Security Note */}
      <View style={styles.securityNote}>
        <Ionicons name="lock-closed" size={14} color={COLORS.textLight} />
        <Text style={styles.securityText}>Secure payment processing</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    paddingHorizontal: 16,
    paddingTop: 16,
  },

  // Amount Card
  amountCard: {
    backgroundColor: COLORS.white,
    borderRadius: 18,
    padding: 28,
    alignItems: 'center',
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  amountLabel: {
    fontSize: 14,
    color: COLORS.textLight,
    fontWeight: '500',
  },
  amountValue: {
    fontSize: 40,
    fontWeight: '800',
    color: COLORS.text,
    marginTop: 4,
  },
  amountSub: {
    fontSize: 13,
    color: COLORS.textLight,
    marginTop: 4,
  },

  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 14,
  },

  // Method Card
  methodCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: COLORS.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  methodCardSelected: {
    borderWidth: 2,
    backgroundColor: COLORS.white,
  },
  methodIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  methodInfo: {
    flex: 1,
  },
  methodLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.text,
  },
  methodDesc: {
    fontSize: 12,
    color: COLORS.textLight,
    marginTop: 2,
  },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: COLORS.gray,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },

  // Pay Button
  payBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: COLORS.primary,
    borderRadius: 16,
    paddingVertical: 18,
    marginTop: 24,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  payBtnDisabled: {
    backgroundColor: COLORS.gray,
    shadowOpacity: 0,
  },
  payBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.white,
  },

  securityNote: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 16,
  },
  securityText: {
    fontSize: 12,
    color: COLORS.textLight,
  },
});
