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

import { Crest } from '@/components/Crest';
import { ThemedText, Colonna } from '@/components/ui';
import { useAuth } from '@/context/auth';
import { useDictation } from '@/hooks/use-dictation';
import { t } from '@/i18n/it';
import { useSpeech } from '@/hooks/use-speech';
import { mergeDictation } from '@/lib/dictation';
import { LimiteAgente, askAgent, type ChatMessage } from '@/lib/ai';
import { createConversation, getLatestConversationId, loadMessages, saveMessage } from '@/lib/conversations';
import { can } from '@/lib/permissions';
import { isSupabaseConfigured } from '@/lib/supabase';
import { radius, spacing, typography, useTheme } from '@/theme';

type UIMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  sources?: { source: string | null }[];
  /** Aree di competenza attivate dal router per questa risposta. */
  domains?: string[];
  error?: boolean;
};

let counter = 0;
const nextId = () => `${Date.now()}-${counter++}`;

export default function Agente() {
  const { colors } = useTheme();
  const { profile } = useAuth();
  const router = useRouter();
  const canManageKnowledge = can(profile, 'knowledge.manage');

  const [messages, setMessages] = useState<UIMessage[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [initializing, setInitializing] = useState(isSupabaseConfigured);
  const [convId, setConvId] = useState<string | null>(null);
  const listRef = useRef<FlatList<UIMessage>>(null);
  const { speakingId, speak, stop, autoRead, setAutoRead } = useSpeech();

  // Il testo dettato si accoda a quanto già digitato; quello provvisorio si
  // mostra a parte, così non sporca l'input se la dettatura viene annullata.
  const [partial, setPartial] = useState('');
  const dictation = useDictation({
    onFinal: (text) => {
      setPartial('');
      setInput((prev) => mergeDictation(prev, text));
    },
    onPartial: setPartial,
  });

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
    stop();
    setConvId(null);
    setMessages([]);
    setInput('');
  }

  async function send() {
    const text = input.trim();
    if (!text || sending) return;

    // Se stava leggendo la risposta precedente, la nuova domanda la interrompe;
    // e non ha senso continuare ad ascoltare dopo l'invio.
    stop();
    if (dictation.listening) dictation.stop();
    setPartial('');

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
      const replyId = nextId();
      setMessages((prev) => [
        ...prev,
        { id: replyId, role: 'assistant', content, sources: reply.sources, domains: reply.domains },
      ]);
      if (autoRead) speak(replyId, content);
      if (isSupabaseConfigured && cid) {
        try {
          await saveMessage(cid, 'assistant', content);
        } catch {
          /* best-effort */
        }
      }
    } catch (e) {
      // Il tetto di spesa non è un guasto: è un'informazione, e va detta
      // com'è. «Errore 429» non spiega niente a chi legge.
      const testo =
        e instanceof LimiteAgente
          ? e.tipo === 'limite_giornaliero'
            ? t.agente.limiteGiornaliero
            : t.agente.limiteMensile
          : e instanceof Error
            ? e.message
            : 'Errore. Riprova.';
      setMessages((prev) => [
        ...prev,
        { id: nextId(), role: 'assistant', content: testo, error: true },
      ]);
    } finally {
      setSending(false);
    }
  }

  const canSend = input.trim().length > 0 && !sending;

  return (
    <SafeAreaView edges={['bottom']} style={{ flex: 1, backgroundColor: colors.background }}>
      <Colonna>
        <View style={[styles.toolbar, { borderBottomColor: colors.border }]}>
          <Pressable onPress={newConversation} accessibilityRole="button">
            <ThemedText tone="accent" variant="caption">
              ＋ Nuova conversazione
            </ThemedText>
          </Pressable>
          <Pressable
            onPress={() => setAutoRead(!autoRead)}
            accessibilityRole="switch"
            accessibilityState={{ checked: autoRead }}
            accessibilityLabel="Leggi automaticamente le risposte"
          >
            <ThemedText tone={autoRead ? 'accent' : 'muted'} variant="caption">
              {autoRead ? '🔊 Lettura attiva' : '🔇 Lettura'}
            </ThemedText>
          </Pressable>
          <Pressable onPress={() => router.push('/agente/memoria')} accessibilityRole="button">
            <ThemedText tone="muted" variant="caption">
              {t.agente.memoriaTitolo} ›
            </ThemedText>
          </Pressable>
          {canManageKnowledge && (
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
              renderItem={({ item }) => (
                <Bubble
                  message={item}
                  speaking={speakingId === item.id}
                  onToggleSpeak={() => speak(item.id, item.content)}
                />
              )}
              ListEmptyComponent={<Welcome />}
              ListFooterComponent={sending ? <Typing /> : null}
              onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
              keyboardDismissMode="interactive"
            />
          )}
  
          {(dictation.listening || dictation.error) && (
            <View style={[styles.dictationBar, { backgroundColor: colors.surfaceAlt, borderTopColor: colors.border }]}>
              <ThemedText tone={dictation.error ? 'error' : 'muted'} variant="caption" numberOfLines={2}>
                {dictation.error ?? (partial ? `“${partial}”` : 'Sto ascoltando… tocca ■ per fermare.')}
              </ThemedText>
            </View>
          )}
  
          <View style={[styles.inputBar, { borderTopColor: colors.border, backgroundColor: colors.surface }]}>
            {dictation.available && (
              <Pressable
                onPress={dictation.toggle}
                disabled={sending}
                accessibilityRole="button"
                accessibilityLabel={dictation.listening ? 'Ferma la dettatura' : 'Detta la domanda'}
                style={[
                  styles.mic,
                  {
                    backgroundColor: dictation.listening ? colors.accent : 'transparent',
                    borderColor: colors.border,
                    opacity: sending ? 0.4 : 1,
                  },
                ]}
              >
                <ThemedText style={{ fontSize: 18, color: dictation.listening ? '#FFFFFF' : colors.textMuted }}>
                  {dictation.listening ? '■' : '🎤'}
                </ThemedText>
              </Pressable>
            )}
            <TextInput
              style={[typography.body, styles.input, { color: colors.text }]}
              value={input}
              onChangeText={setInput}
              placeholder={dictation.listening ? 'Parla pure…' : "Scrivi all'agente…"}
              placeholderTextColor={colors.textMuted}
              multiline
              editable={!sending}
            />
            <Pressable
              onPress={send}
              disabled={!canSend}
              accessibilityRole="button"
              accessibilityLabel={t.agente.inviaEtichetta}
              accessibilityState={{ disabled: !canSend }}
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
      </Colonna>
    </SafeAreaView>
  );
}

function Bubble({
  message,
  speaking,
  onToggleSpeak,
}: {
  message: UIMessage;
  speaking: boolean;
  onToggleSpeak: () => void;
}) {
  const { colors } = useTheme();
  const isUser = message.role === 'user';
  const domains = !isUser && !message.error ? (message.domains ?? []) : [];
  const canSpeak = !isUser && !message.error && message.content.trim().length > 0;
  return (
    <View style={{ alignItems: isUser ? 'flex-end' : 'flex-start' }}>
      {domains.length > 0 && (
        <View style={styles.domains}>
          {domains.map((d) => (
            <View
              key={d}
              style={[styles.chip, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}
            >
              <ThemedText tone="muted" variant="caption">
                {d}
              </ThemedText>
            </View>
          ))}
        </View>
      )}
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
      {canSpeak && (
        <Pressable
          onPress={onToggleSpeak}
          accessibilityRole="button"
          accessibilityLabel={speaking ? 'Interrompi la lettura' : 'Ascolta la risposta'}
          hitSlop={8}
          style={{ marginTop: spacing.xs }}
        >
          <ThemedText tone={speaking ? 'accent' : 'muted'} variant="caption">
            {speaking ? '■ Interrompi' : '▶ Ascolta'}
          </ThemedText>
        </Pressable>
      )}
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
  return (
    <View style={{ gap: spacing.md, paddingVertical: spacing.xxl, alignItems: 'center' }}>
      <Crest size={72} />
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
  domains: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginBottom: spacing.xs,
    maxWidth: '88%',
  },
  chip: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
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
  dictationBar: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  mic: {
    width: 44,
    height: 44,
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
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
});
