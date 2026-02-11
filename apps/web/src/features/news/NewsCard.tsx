import type { FC } from 'react';
import type { NewsArticle } from '../../lib/api';
import './MorningBrief.css';

interface NewsCardProps {
  article: NewsArticle;
  category: string;
}

const NewsCard: FC<NewsCardProps> = ({ article, category }) => {
  const categoryLabels: Record<string, string> = {
    politics: '🏛️ Politique',
    business: '💼 Économie',
    sports: '⚽ Sport',
    France: '🇫🇷 France',
    Monde: '🌍 Monde',
    'À la une': '🏆 À la une',
  };

  const categoryColors: Record<string, string> = {
    politics: 'var(--color-primary)',
    business: 'var(--color-success)',
    sports: 'var(--color-warning)',
    France: 'var(--color-info)',
    Monde: 'var(--color-neutral)',
    'À la une': 'var(--color-danger)',
  };

  const label = categoryLabels[category] || category;
  const color = categoryColors[category] || 'var(--color-primary)';

  return (
    <a 
      href={article.url} 
      target="_blank" 
      rel="noopener noreferrer" 
      className={`news-card news-card--${category}`}
      style={{ '--category-color': color } as React.CSSProperties}
    >
      <div className="news-card__image-container">
        {article.urlToImage ? (
          <img src={article.urlToImage} alt={article.title} className="news-card__image" loading="lazy" />
        ) : (
          <div className="news-card__placeholder">
            <span>{label.split(' ')[0]}</span>
          </div>
        )}
        <div className="news-card__category">{label}</div>
      </div>
      
      <div className="news-card__content">
        <h3 className="news-card__title">{article.title}</h3>
        <p className="news-card__description">
          {article.description 
            ? (article.description.length > 100 ? article.description.substring(0, 100) + '...' : article.description)
            : 'Cliquez pour lire l\'article complet sur le site de la source.'}
        </p>
        
        <div className="news-card__footer">
          <span className="news-card__source">{article.source.name}</span>
          <span className="news-card__date">
            {new Date(article.publishedAt).toLocaleDateString('fr-FR', { 
              hour: '2-digit', 
              minute: '2-digit' 
            })}
          </span>
        </div>
      </div>
    </a>
  );
};

export default NewsCard;
