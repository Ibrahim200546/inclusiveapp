# Audio provenance and known gaps

## Added dombyra excerpt

- App asset: `public/original/sounds/musical/dombra.mp3`
- Title: Master of Dombra
- Attribution: Ербол Акпанов (Yerbol Akpanov), 2018
- Source: https://commons.wikimedia.org/wiki/File:Master_of_Dombra.webm
- Original source: https://www.youtube.com/watch?v=IyqdmbYs5EA
- License: CC BY 3.0 Unported, https://creativecommons.org/licenses/by/3.0/
- Wikimedia revision inspected: oldid=1073125905; license review recorded 2020-02-12
- Modification: audio excerpt 00:30–00:38, mono 44.1 kHz MP3 128 kbps, 50 ms fade-in, 300 ms fade-out. Eight seconds; encoded duration about 8.05 seconds.
- Visual verification: four source frames from the excerpt show the performer playing a dombyra. Decoding and non-silent audio are checked. The automation runtime cannot listen to audio, so human auditory confirmation of a clean sample remains necessary.
- User-facing attribution is linked in the instrument task and included in the shipped public assets.

## Not substituted with unrelated samples

Qobyz and sybyzgy descriptions are present as familiarization content. They are not randomly selected or offered as scored listening answers until an authentic, redistributable recording is supplied. A CC0 FMA item titled «кобыз» by Kosta T was found, but its title and genre metadata alone do not verify that it is a clean solo qobyz sample. It was not shipped.

Existing sounds were supplied by the repository. Their provenance/license was not newly asserted or changed.

## Other recording gaps

- `sounds/dialog/{child,adult,both}.mp3` do not exist; the dialogue task explicitly reports unavailability and never invents a correct answer.
- Original four syllable recordings are preserved unchanged, with their original count metadata. Their spoken content is not transcribed or newly asserted here.
- Twenty new syllable words include 14 exact isolated-word recordings. The six without one are ат, нан, шар, балабақша, кітапхана, ойыншықтар. The alphabet-prefixed «ш шар» clip is deliberately excluded. Words use exact matching existing Kazakh recordings where present, then a locally installed Kazakh speech voice only. If absent, they explicitly switch to reading mode, displaying the word without pretending audio played. No new paid TTS request is made.
- Legacy low/mid voice recordings share the same source, and historical medium rhythm reuses slow. These source-content gaps must be reviewed by an educator; no pitch shifting, relabeling, or synthetic substitute is presented as an authentic recording.
