export function PracticeHeader({ locale, active }: { locale: 'kk' | 'ru'; active: boolean }) {
  return (
    <div className="header" data-react-owned="true" data-i18n-managed="true" style={{ display: active ? 'block' : 'none' }}>
      <h1>{locale === 'ru' ? '🎧 Волшебный мир звуков' : '🎧 Сиқырлы Дыбыстар Әлемі'}</h1>
      <p>{locale === 'ru'
        ? 'Интерактивная платформа для детей с нарушением слуха'
        : 'Есту қабілеті нашар балаларға арналған интерактивті платформа'}</p>
    </div>
  );
}
