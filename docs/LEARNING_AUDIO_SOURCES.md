# Learning audio sources

## Kazakh syllable words

New external spoken words use human recordings from Lingua Libre / Wikimedia Commons, speaker and recorder **Nurken**, dedicated to **CC0 1.0**. Additional words reuse existing standalone project recordings from `sounds/kk-human`; their original ownership is unchanged and no new public-domain claim is made. Source pages and license URLs are carried in each content entry. WAV files are copied without changes; Commons MP3 transcodes are used when the original WAV endpoint is rate limited. Existing MP4 human audio recordings are reused directly without joining alphabet sounds. Existing `word_1.mp3` through `word_4.mp3` must remain unchanged.

Groups (five new recordings each):

| Syllables | Words |
| --- | --- |
| 1 | ат, күн, жол, қол, сөз |
| 2 | мектеп, алма, қалам, мысық, шана |
| 3 | балалар, ойнады, сыпырды, тақия, оянды |
| 4 | алабұта, бағдарлама, республика, құрастырды, ұйықтады |

`құрастырды` = құ-рас-тыр-ды; `ұйықтады` = ұ-йық-та-ды. Both are existing standalone human recordings, not sentences. `оянды` uses the existing file `оянды 104.mp4`.

Source naming: `File:LL-Q9252 (kaz)-Nurken-<word>.wav`.

[Speaker Nurken](https://lingualibre.org/wiki/Q1561628), [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/).

## Dombra

- Title: **Master of Dombra**.
- Author / attribution: **Ербол Акпанов**.
- Source: https://commons.wikimedia.org/wiki/File:Master_of_Dombra.webm
- Original publication: 8 April 2018.
- License: [CC BY 3.0](https://creativecommons.org/licenses/by/3.0/).
- Local file: `public/original/sounds/kazakh-instruments/dombra.mp3`.
- Changes: extract 00:30–00:38, remove video, downmix to mono, encode MP3 128 kbps / 44.1 kHz. No synthesized notes.
- Visual confirmation: frame at 00:30 shows the performer playing an actual dombra.
- Attribution must also be visible in the exercise UI, not only in this document.

## Remaining source gaps

Do not substitute a violin recording for қобыз, a generic flute for сыбызғы, or an instrument-name pronunciation for the instrument sound. Wikimedia Commons searches for қобыз / kobyz / qobyz and сыбызғы / sybyzgy currently yielded photographs, not suitable recordings. Bandcamp sources checked for sybyzgy are all-rights-reserved and were not downloaded. Only instruments with real local recordings and verified reuse licenses may enter the listening exercise.

## Verification

WAV assets must have a valid RIFF/WAVE header, nonzero audio data, unique paths and correctly assigned syllable count. Failed downloads must never count as playable entries. Remote media are required only for development acquisition; the exercise uses bundled local files.


## External word provenance (verified 2026-10-01)

All nine source-page imageinfo metadata entries explicitly returned `LicenseShortName: CC0`.

| Word | Source page | Local format |
| --- | --- | --- |
| ат | [Nurken recording](https://commons.wikimedia.org/wiki/File%3ALL-Q9252_(kaz)-Nurken-%D0%B0%D1%82.wav) | .wav |
| күн | [Nurken recording](https://commons.wikimedia.org/wiki/File%3ALL-Q9252_(kaz)-Nurken-%D0%BA%D2%AF%D0%BD.wav) | .wav |
| жол | [Nurken recording](https://commons.wikimedia.org/wiki/File%3ALL-Q9252_(kaz)-Nurken-%D0%B6%D0%BE%D0%BB.wav) | .mp3 |
| қол | [Nurken recording](https://commons.wikimedia.org/wiki/File%3ALL-Q9252_(kaz)-Nurken-%D2%9B%D0%BE%D0%BB.wav) | .mp3 |
| сөз | [Nurken recording](https://commons.wikimedia.org/wiki/File%3ALL-Q9252_(kaz)-Nurken-%D1%81%D3%A9%D0%B7.wav) | .mp3 |
| мектеп | [Nurken recording](https://commons.wikimedia.org/wiki/File%3ALL-Q9252_(kaz)-Nurken-%D0%BC%D0%B5%D0%BA%D1%82%D0%B5%D0%BF.wav) | .wav |
| алабұта | [Nurken recording](https://commons.wikimedia.org/wiki/File%3ALL-Q9252_(kaz)-Nurken-%D0%B0%D0%BB%D0%B0%D0%B1%D2%B1%D1%82%D0%B0.wav) | .mp3 |
| бағдарлама | [Nurken recording](https://commons.wikimedia.org/wiki/File%3ALL-Q9252_(kaz)-Nurken-%D0%B1%D0%B0%D2%93%D0%B4%D0%B0%D1%80%D0%BB%D0%B0%D0%BC%D0%B0.wav) | .mp3 |
| республика | [Nurken recording](https://commons.wikimedia.org/wiki/File%3ALL-Q9252_(kaz)-Nurken-%D1%80%D0%B5%D1%81%D0%BF%D1%83%D0%B1%D0%BB%D0%B8%D0%BA%D0%B0.wav) | .mp3 |
