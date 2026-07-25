import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/ui';
import { useAuth } from '@/context/auth';
import { askAgent, type ChatMessage } from '@/lib/ai';
import { createConversation, getLatestConversationId, loadMessages, saveMessage } from '@/lib/conversations';
import { isSupabaseConfigured } from '@/lib/supabase';
import { radius, spacing, typography, useTheme } from '@/theme';

type UIMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  sources?: { source: string | null }[];
  error?: boolean;
};

let counter = 0;
const nextId = () => `${Date.now()}-${counter++}`;

export default function Agente() {
  const { colors } = useTheme();
  const { profile } = useAuth();
  const router = useRouter();
  const isAdmin = profile?.role === 'admin';

  const [messages, setMessages] = useState<UIMessage[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [initializing, setInitializing] = useState(isSupabaseConfigured);
  const [convId, setConvId] = useState<string | null>(null);
  const listRef = useRef<FlatList<UIMessage>>(null);

  // Carica l'ultima conversazione (se il backend è configurato).
  useEffect(() => {
    let active = true;
    if (!isSupabaseConfigured) {
      setInitializing(false);
      return;
    }
    (async () => {
      try {
        const id = await getLatestConversationId();
        if (id) {
          const stored = await loadMessages(id);
          if (active) {
            setConvId(id);
            setMessages(stored.map((m) => ({ id: m.id, role: m.role, content: m.content })));
          }
        }
      } catch {
        // caricamento cronologia best-effort
      } finally {
        if (active) setInitializing(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  function newConversation() {
    setConvId(null);
    setMessages([]);
    setInput('');
  }

  async function send() {
    const text = input.trim();
    if (!text || sending) return;

    const history: ChatMessage[] = messages
      .filter((m) => !m.error)
      .map((m) => ({ role: m.role, content: m.content }));

    setMessages((prev) => [...prev, { id: nextId(), role: 'user', content: text }]);
    setInput('');
    setSending(true);

    let cid = convId;
    try {
      if (isSupabaseConfigured) {
        if (!cid) {
          cid = await createConversation();
          setConvId(cid);
        }
        await saveMessage(cid, 'user', text);
      }
    } catch {
      // persistenza best-effort: non blocca la chat
    }

    try {
      const reply = await askAgent(text, history);
      const content = reply.answer || '—';
      setMessages((prev) => [
        ...prev,
        { id: nextId(), role: 'assistant', content, sources: reply.sources },
      ]);
      if (isSupabaseConfigured && cid) {
        try {
          await saveMessage(cid, 'assistant', content);
        } catch {
          /* best-effort */
        }
      }
    } catch (e) {
      setMessages((prev) => [
        ...prev,
        {
          id: nextId(),
          role: 'assistant',
          content: e instanceof Error ? e.message : 'Errore. Riprova.',
          error: true,
        },
      ]);
    } finally {
      setSending(false);
    }
  }

  const canSend = input.trim().length > 0 && !sending;

  return (
    <SafeAreaView edges={['bottom']} style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={[styles.toolbar, { borderBottomColor: colors.border }]}>
        <Pressable onPress={newConversation} accessibilityRole="button">
          <ThemedText tone="accent" variant="caption">
            ＋ Nuova conversazione
          </ThemedText>
        </Pressable>
        {isAdmin && (
          <Pressable onPress={() => router.push('/agente/documenti')} accessibilityRole="button">
            <ThemedText tone="muted" variant="caption">
              Base di conoscenza ›
            </ThemedText>
          </Pressable>
        )}
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 96 : 0}
      >
        {initializing ? (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <ActivityIndicator color={colors.textMuted} />
          </View>
        ) : (
          <FlatList
            ref={listRef}
            data={messages}
            keyExtractor={(m) => m.id}
            contentContainerStyle={{ padding: spacing.lg, flexGrow: 1, gap: spacing.sm }}
            renderItem={({ item }) => <Bubble message={item} />}
            ListEmptyComponent={<Welcome />}
            ListFooterComponent={sending ? <Typing /> : null}
            onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
            keyboardDismissMode="interactive"
          />
        )}

        <View style={[styles.inputBar, { borderTopColor: colors.border, backgroundColor: colors.surface }]}>
          <TextInput
            style={[typography.body, styles.input, { color: colors.text }]}
            value={input}
            onChangeText={setInput}
            placeholder="Scrivi all'agente…"
            placeholderTextColor={colors.textMuted}
            multiline
            editable={!sending}
          />
          <Pressable
            onPress={send}
            disabled={!canSend}
            accessibilityRole="button"
            style={[styles.send, { backgroundColor: colors.accent, opacity: canSend ? 1 : 0.4 }]}
          >
            {sending ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <ThemedText style={styles.sendGlyph}>↑</ThemedText>
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Bubble({ message }: { message: UIMessage }) {
  const { colors } = useTheme();
  const isUser = message.role === 'user';
  return (
    <View style={{ alignItems: isUser ? 'flex-end' : 'flex-start' }}>
      <View
        style={{
          maxWidth: '88%',
          backgroundColor: isUser ? colors.accent : colors.surface,
          borderColor: message.error ? colors.error : colors.border,
          borderWidth: StyleSheet.hairlineWidth,
          borderRadius: radius.lg,
          paddingHorizontal: spacing.md,
          paddingVertical: spacing.sm,
        }}
      >
        <ThemedText style={{ color: isUser ? '#FFFFFF' : message.error ? colors.error : colors.text }}>
          {message.content}
        </ThemedText>
      </View>
      {message.sources && message.sources.length > 0 && (
        <ThemedText tone="muted" variant="caption" style={{ marginTop: spacing.xs, maxWidth: '88%' }}>
          Fonti: {message.sources.map((s) => s.source ?? 'documento').join(' · ')}
        </ThemedText>
      )}
    </View>
  );
}

function Typing() {
  const { colors } = useTheme();
  return (
    <View style={{ alignItems: 'flex-start', marginTop: spacing.sm }}>
      <View
        style={{
          backgroundColor: colors.surface,
          borderColor: colors.border,
          borderWidth: StyleSheet.hairlineWidth,
          borderRadius: radius.lg,
          paddingHorizontal: spacing.md,
          paddingVertical: spacing.sm,
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.sm,
        }}
      >
        <ActivityIndicator color={colors.textMuted} />
        <ThemedText tone="muted" variant="caption">
          Sto pensando…
        </ThemedText>
      </View>
    </View>
  );
}

function Welcome() {
  const { colors } = useTheme();
  return (
    <View style={{ gap: spacing.md, paddingVertical: spacing.xxl, alignItems: 'center' }}>
      <View style={[styles.eyeRing, { borderColor: colors.gold }]}>
        <View style={[styles.pupil, { backgroundColor: colors.accent }]} />
      </View>
      <ThemedText variant="title">Agente AI</ThemedText>
      <ThemedText tone="muted" variant="caption" style={{ textAlign: 'center', maxWidth: 300 }}>
        Fai una domanda sui contenuti della piattaforma. Le risposte si basano sulla base di
        conoscenza; nessuna consulenza finanziaria personalizzata.
      </ThemedText>
      {!isSupabaseConfigured && (
        <ThemedText tone="error" variant="caption" style={{ textAlign: 'center', maxWidth: 300 }}>
          Backend non configurato: imposta .env e fai il deploy della function «ai-chat».
        </ThemedText>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  toolbar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.sm,
    padding: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  input: {
    flex: 1,
    maxHeight: 120,
    minHeight: 44,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
  },
  send: {
    width: 44,
    height: 44,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendGlyph: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '800',
    lineHeight: 22,
  },
  eyeRing: {
    width: 64,
    height: 64,
    borderRadius: radius.pill,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pupil: {
    width: 20,
    height: 20,
    borderRadius: radius.pill,
  },
});
