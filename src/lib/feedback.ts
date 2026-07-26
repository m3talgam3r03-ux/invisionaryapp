import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { decode } from 'base64-arraybuffer';
import * as ImagePicker from 'expo-image-picker';

import type { FeedbackPost } from '@/types/models';

import { supabase } from './supabase';

export type PickedImage = { base64: string; mimeType: string };

/** Feed Community: post più recenti (visibili a tutta la rete). */
export function useFeedbackPosts() {
  return useQuery({
    queryKey: ['feedback'],
    queryFn: async (): Promise<FeedbackPost[]> => {
      const { data, error } = await supabase
        .from('feedback_posts')
        .select('id, owner_id, author_name, body, photo_url, created_at')
        .order('created_at', { ascending: false })
        .limit(100);
      if (error) throw error;
      return data as FeedbackPost[];
    },
  });
}

/** Apre la galleria e restituisce l'immagine come base64. */
export async function pickImage(): Promise<PickedImage | null> {
  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) return null;

  const res = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    base64: true,
    quality: 0.6,
  });
  if (res.canceled || !res.assets?.length) return null;

  const asset = res.assets[0];
  if (!asset.base64) return null;
  return { base64: asset.base64, mimeType: asset.mimeType ?? 'image/jpeg' };
}

/** Crea un post di feedback, caricando prima l'eventuale foto su Storage. */
export function useCreateFeedbackPost() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      body,
      photo,
      authorName,
    }: {
      body: string;
      photo: PickedImage | null;
      authorName: string | null;
    }): Promise<void> => {
      let photoUrl: string | null = null;

      if (photo) {
        const { data: userData } = await supabase.auth.getUser();
        const uid = userData.user?.id ?? 'anon';
        const ext = photo.mimeType.includes('png') ? 'png' : 'jpg';
        const path = `${uid}/${Date.now()}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from('feedback')
          .upload(path, decode(photo.base64), { contentType: photo.mimeType });
        if (upErr) throw upErr;
        photoUrl = supabase.storage.from('feedback').getPublicUrl(path).data.publicUrl;
      }

      const { error } = await supabase.from('feedback_posts').insert({
        body: body.trim() || null,
        photo_url: photoUrl,
        author_name: authorName,
      });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['feedback'] }),
  });
}
