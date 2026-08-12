# Pagina pubblica dei funnel

[`index.html`](index.html) è la pagina che vede chi riceve il link. **Un file
solo**, senza framework, senza caratteri da scaricare, senza librerie: si apre e
c'è. Non è pigrizia — una pagina di atterraggio che ci mette tre secondi a
comparire perde contatti.

**Una pagina serve tutti i funnel.** Quale mostrare lo dice `?f=slug`; titolo,
sottotitolo, canali e testo del consenso arrivano dall'endpoint. Aggiungere un
funnel non richiede di ripubblicare niente.

## Metterla online

1. **Deploya la function** (senza `--no-verify-jwt` una pagina pubblica non può
   chiamarla):

   ```bash
   npx supabase functions deploy funnel-submit --no-verify-jwt
   npx supabase secrets set FUNNEL_IP_SALT="$(openssl rand -hex 32)"
   ```

2. **Apri `index.html`** e sostituisci l'unico valore da configurare:

   ```js
   const ENDPOINT = 'https://<PROJECT-REF>.functions.supabase.co/funnel-submit';
   ```

3. **Caricala** dove preferisci: qualunque hosting statico va bene — Netlify,
   Vercel, Cloudflare Pages, uno spazio web, perfino un bucket. È un file.

4. **Dillo all'app**, così mostra il link completo invece del solo slug. In
   `.env`:

   ```
   EXPO_PUBLIC_FUNNEL_BASE_URL=https://vai.iltuodominio.it
   ```

Il link da distribuire diventa `https://vai.iltuodominio.it/?f=corso-base`.

## Nessuna chiave qui dentro

L'unica cosa configurata è l'indirizzo della function. La anon key di Supabase
sarebbe pubblica per definizione e protetta dalla RLS, ma un file HTML che gira
per host diversi con una chiave dentro è una cosa in più da ricordare, ruotare e
spiegare. **Un indirizzo è meglio di un indirizzo e una chiave.**

## Cosa fa la pagina, e cosa NON fa

| | |
| --- | --- |
| Campo civetta | Fuori dallo schermo, non `display:none` — molti robot saltano quelli nascosti così |
| Tempo di compilazione | Lo misura e lo manda: sotto i 3 s il server scarta |
| Controlli sui campi | Sono **cortesia, non sicurezza**: il server li rifà tutti |
| Consenso | **Una spunta per canale.** Chi acconsente all'email non ha acconsentito a WhatsApp |

Il server risponde `200` anche ai robot: a un robot non si spiega cosa ha
sbagliato, altrimenti impara a evitarlo.

## Provarla in locale

Aprendo il file col doppio clic serve comunque `?f=<slug>` nell'indirizzo,
altrimenti la pagina dice — correttamente — che non è disponibile:

```
file:///…/funnel/index.html?f=corso-base
```

## Se serve la versione «vera»

Questa pagina è pensata per essere sostituibile: l'endpoint è quello, il
contratto non cambia. Se un domani serve un sito con più pagine, SEO e blog,
si costruisce accanto e continua a parlare a `funnel-submit` — senza toccare né
il database né l'app.
