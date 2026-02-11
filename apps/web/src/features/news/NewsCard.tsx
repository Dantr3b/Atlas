import { FC } from 'react';
import { NewsArticle } from '../../lib/api';
import './MorningBrief.css';

interface NewsCardProps {
  article: NewsArticle;
  category: 'politics' | 'business' | 'sports';
}

const NewsCard: FC<NewsCardProps> = ({ article, category }) => {
  const categoryLabels = {
    politics: '🏛️ Politique',
    business: '💼 Économie',
    sports: '⚽ Sport',
  };

  const categoryColors = {
    politics: 'var(--color-primary)',
    business: 'var(--color-success)',
    sports: 'var(--color-warning)',
  };

  return (
    <a 
      href={article.url} 
      target="_blank" 
      rel="noopener noreferrer" 
      className={`news-card news-card--${category}`}
      style={{ '--category-color': categoryColors[category] } as React.CSSProperties}
    >
      <div className="news-card__image-container">
        {article.urlToImage ? (
          <img src={article.urlToImage} alt={article.title} className="news-card__image" loading="lazy" />
        ) : (
          <div className="news-card__placeholder">
            <span>{categoryLabels[category].split(' ')[0]}</span>
          </div>
        )}
        <div className="news-card__category">{categoryLabels[category]}</div>
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
