import { Link } from "react-router-dom";
import { useState } from "react";

const NotFound = () => {
  const [kazakh] = useState(() => {
    try { return localStorage.getItem("locale") === "kk"; }
    catch { return false; }
  });

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted">
      <div className="text-center">
        <h1 className="mb-4 text-4xl font-bold">404</h1>
        <p className="mb-4 text-xl text-muted-foreground">{kazakh ? "Бет табылмады" : "Страница не найдена"}</p>
        <Link to="/" className="text-primary underline hover:text-primary/90">
          {kazakh ? "Басты бетке оралу" : "Вернуться на главную"}
        </Link>
      </div>
    </div>
  );
};

export default NotFound;
