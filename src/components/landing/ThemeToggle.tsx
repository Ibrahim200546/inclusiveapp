
interface ThemeToggleProps {
  isDark: boolean;
  toggleTheme: () => void;
}

const ThemeToggle = ({ isDark, toggleTheme }: ThemeToggleProps) => {
  return (
    <label className="relative inline-block w-16 h-[34px] cursor-pointer shrink-0">
      <input
        type="checkbox"
        checked={isDark}
        onChange={toggleTheme}
        className="opacity-0 w-0 h-0"
      />
      <span
        className="absolute inset-0 rounded-full transition-colors duration-400"
        style={{ backgroundColor: isDark ? '#2c3e50' : '#73C0FC' }}
      >
        {/* Sun icon */}
        <span
          className="absolute top-[6px] right-[6px] transition-opacity duration-300"
          style={{ opacity: isDark ? 0 : 1 }}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="12" cy="12" r="5" fill="#f39c12" />
            <line x1="12" y1="1" x2="12" y2="4" stroke="#f39c12" strokeWidth="2" strokeLinecap="round" />
            <line x1="12" y1="20" x2="12" y2="23" stroke="#f39c12" strokeWidth="2" strokeLinecap="round" />
            <line x1="4.22" y1="4.22" x2="6.34" y2="6.34" stroke="#f39c12" strokeWidth="2" strokeLinecap="round" />
            <line x1="17.66" y1="17.66" x2="19.78" y2="19.78" stroke="#f39c12" strokeWidth="2" strokeLinecap="round" />
            <line x1="1" y1="12" x2="4" y2="12" stroke="#f39c12" strokeWidth="2" strokeLinecap="round" />
            <line x1="20" y1="12" x2="23" y2="12" stroke="#f39c12" strokeWidth="2" strokeLinecap="round" />
            <line x1="4.22" y1="19.78" x2="6.34" y2="17.66" stroke="#f39c12" strokeWidth="2" strokeLinecap="round" />
            <line x1="17.66" y1="6.34" x2="19.78" y2="4.22" stroke="#f39c12" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </span>
        {/* Moon icon */}
        <span
          className="absolute top-[5px] left-[5px] transition-opacity duration-300"
          style={{ opacity: isDark ? 1 : 0 }}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="#73C0FC" xmlns="http://www.w3.org/2000/svg">
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
          </svg>
        </span>
        {/* Slider dot */}
        <span
          className="absolute bottom-[2px] h-[30px] w-[30px] rounded-full bg-[#e8e8e8] transition-transform duration-400 shadow-md"
          style={{
            left: isDark ? 'calc(100% - 32px)' : '2px',
          }}
        />
      </span>
    </label>
  );
};

export default ThemeToggle;
