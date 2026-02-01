import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Pressable, StyleSheet, TextInput } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors } from '@/constants/theme';
import { useAuth } from '@/context/auth-context';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function AuthScreen() {
  const router = useRouter();
  const { signIn } = useAuth();
  const theme = useColorScheme() ?? 'light';
  const colors = Colors[theme];

  const [phoneNumber, setPhoneNumber] = useState('');
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    const raw = phoneNumber.trim();
    const digits = raw.replace(/\D/g, '');

    if (digits.length < 7) {
      setError('Please enter a valid phone number.');
      return;
    }

    setError(null);
    await signIn(raw);
    router.replace('/(tabs)');
  };

  return (
    <ThemedView style={styles.container}>
      <ThemedView style={[styles.card, { borderColor: colors.border, backgroundColor: colors.surface }]}>
        <ThemedText style={styles.title}>Welcome</ThemedText>
        <ThemedText style={styles.subtitle}>Enter your phone number to save your trips on this device.</ThemedText>

        <TextInput
          value={phoneNumber}
          onChangeText={setPhoneNumber}
          placeholder="Phone number"
          placeholderTextColor="#888"
          keyboardType="phone-pad"
          autoComplete="tel"
          style={[styles.input, { borderColor: colors.border, color: colors.inputText }]}
        />

        {error ? <ThemedText style={styles.errorText}>{error}</ThemedText> : null}

        <Pressable style={[styles.button, { backgroundColor: colors.primary }]} onPress={submit}>
          <ThemedText style={styles.buttonText}>Continue</ThemedText>
        </Pressable>
      </ThemedView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
  },
  card: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 12,
    padding: 16,
    gap: 12,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
  },
  subtitle: {
    opacity: 0.75,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  errorText: {
    color: '#d00',
    fontWeight: '600',
  },
  button: {
    backgroundColor: '#007AFF',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontWeight: '700',
  },
});
