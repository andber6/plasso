import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Personvern' };

// Adapted from the Newly project's website/app/personvern. Updated for the web
// version: usage tracking and opt-in contact from the Plasso team are described.
// Have this reviewed before launch.
export default function PrivacyPage() {
  return (
    <article className="mx-auto flex max-w-2xl flex-col gap-4 py-4 text-[16px] leading-relaxed [&_h2]:mt-6 [&_h2]:text-xl [&_h2]:font-semibold [&_li]:ml-5 [&_li]:list-disc [&_p]:text-foreground/85">
      <p className="font-mono text-xs uppercase tracking-[0.16em] text-accent">Personvern</p>
      <h1 className="text-4xl font-bold">Personvernerklæring</h1>
      <p className="text-sm text-muted">Sist oppdatert 3. november 2026 · utkast</p>

      <h2>Kort fortalt</h2>
      <p>
        Plasso er gratis. Vi samler inn det som trengs for å drive markedsplassen, og vi bruker søk og aktivitet til å forstå hva slags lokaler bedrifter
        leter etter. Vi selger ikke personopplysninger. Har du sagt ja til det, kan vi kontakte deg om lokaler eller leietakere som passer.
      </p>

      <h2>Hva vi lagrer</h2>
      <ul>
        <li><strong>Konto:</strong> e-postadresse, og passord (lagret kryptert) hvis du bruker det. Logger du inn med e-postlenke, lagrer vi ikke noe passord.</li>
        <li>
          <strong>Leieønsker uten konto:</strong> sender du skjemaet på forsiden, lagrer vi det du fyller inn sammen med navn og e-post. Leieønsket blir ikke
          synlig for andre før du har bekreftet e-posten.
        </li>
        <li><strong>Profil:</strong> navn, firma, telefon, om du er leietaker, utleier eller megler, og om vi kan kontakte deg.</li>
        <li><strong>Annonser:</strong> leieønsker og utleieannonser med type, sted, areal, pris, tidspunkt, leietid, fasiliteter, beskrivelse og bilder.</li>
        <li><strong>Forespørsler</strong> om kontakt eller visning, og <strong>lagrede annonser, rapporter og blokkeringer</strong>.</li>
        <li>
          <strong>Bruk:</strong> hvilke filtre du søker med, hvilke annonser du ser på og lagrer. Før du logger inn er dette knyttet til en anonym
          informasjonskapsel; logger du inn, knyttes det til kontoen din.
        </li>
      </ul>

      <h2>Hva vi bruker det til</h2>
      <ul>
        <li>Å vise annonser, regne ut samsvar og sende deg varsel om nye matcher.</li>
        <li>Å formidle forespørsler mellom leietakere og utleiere.</li>
        <li>Å forstå etterspørselen i markedet (for eksempel hvilke byer og størrelser som mangler lokaler), slik at vi kan forbedre tjenesten.</li>
        <li>Hvis du har sagt ja: å kontakte deg om lokaler eller leietakere som passer. Du kan trekke samtykket under Profil.</li>
      </ul>

      <h2>Hvem ser hva</h2>
      <p>
        Annonser er synlige for alle, med navnet og firmaet ditt. E-post og telefon deles bare med den du sender en forespørsel til, eller som sender en til
        deg.
      </p>

      <h2>Hvem behandler dataene</h2>
      <p>
        Nettsiden driftes hos Vercel, databasen hos Neon og bildene i Vercel Blob, alt i EU (Frankfurt). E-post sendes gjennom Resend. Disse behandler
        opplysningene på våre vegne og bruker dem ikke til noe annet. Vi deler ikke opplysninger med andre, med mindre loven krever det.
      </p>

      <h2>Hvor lenge</h2>
      <p>Så lenge du har en konto. Under Profil kan du slette kontoen, og da slettes profil, annonser, forespørsler, lagrede annonser og bruksdata.</p>

      <h2>Dine rettigheter</h2>
      <p>Etter personvernforordningen (GDPR) kan du be om innsyn, retting og sletting, og du kan klage til Datatilsynet.</p>
    </article>
  );
}
