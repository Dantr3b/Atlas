export default function HomePage() {
  return (
    <div className="page home-page" style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      alignItems: 'center', 
      justifyContent: 'center', 
      minHeight: '60vh',
      textAlign: 'center'
    }}>
      <h1 style={{ 
        fontSize: '3rem', 
        marginBottom: '1rem',
        background: 'linear-gradient(135deg, var(--color-primary), var(--color-secondary))',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent'
      }}>
        Bienvenue sur Atlas
      </h1>
      <p className="text-secondary" style={{ fontSize: '1.2rem', maxWidth: '600px' }}>
        Votre système d'organisation personnel intelligent.
        Accédez à votre Inbox pour voir toutes vos tâches ou utilisez "Aujourd'hui" pour vous concentrer.
      </p>
    </div>
  );
}
