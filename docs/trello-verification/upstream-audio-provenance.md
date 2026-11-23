# Сверка обновлённых записей с Git

В коммите [9e23fdf](https://github.com/Ibrahim200546/inclusiveapp/commit/9e23fdf04cd9cb14045a2884419ceb9d8ac56a48) уже заменены действующие записи дождя, лисы и медведя. Сверка не меняет файлы: в инвентаре обновлены размер, SHA-256 и PCM-отпечаток текущих записей, а прежние архивные пути и SHA-256 дождя и лисы явно отмечены как исторические. Их SHA-256 совпадают с соответствующими файлами в родительском [fbb0d49](https://github.com/Ibrahim200546/inclusiveapp/commit/fbb0d49aaad011fbf1a22298cfae3aaaeda1f87a). Наличие записи в Git не подтверждает внешнего автора, лицензию или педагогическую пригодность.

Файл зевка уже есть в родительском коммите; его байты совпадают с текущей записью. Его исходные права также не подтверждены. Назначения всех активных файлов сверены с актуальными классами, этапами и предзагрузкой. Для неизменённых записей архивные SHA-256 проверяются как раньше; отдельные сведения о ремонте барабана сохранены. Историческое число 49 относится к документированным архивным строкам, а не к числу текущих файлов, которые побайтно совпадают с архивом.

Техническая проверка не заменяет получение источника и прав на запись, прослушивание педагогом и проверку соответствия звука подписи.

## Audio paths restored in upstream `a2aa24e`

The extra `aspaptar/dombra.mp3` and `aspaptar/violin.mp3` are byte-identical to the canonical recordings in `sounds/instruments/`. The extra paths are catalogued as inactive aliases, not independently approved recordings. No existing exercise points to them.

The restored `aspaptar/drum.mp3` is an unused copy of the original malformed archive member, with SHA-256 `6a2d015a7cf945195533953f262fc88f4a8b6365c3793577e55ac2af9eecc308`. It fails strict audio decoding and is preserved in upstream history and the source-archive record, not in the public candidate. The repaired `sounds/instruments/drum.mp3` used by the exercises is unchanged.
