import React, { useEffect, useState } from 'react';
import { Link, generatePath, useNavigate } from 'react-router-dom';
import { Trans, useTranslation } from 'react-i18next';
import { AddPostModal } from './AddPostModal';
import { fetchPosts as fetchPostsFromApi, fetchSimilarPosts, moderatePost as moderatePostApi } from './api';
import type { Post } from './types';
import { formatForumDate } from './formatForumDate';
import { useLocale } from '../../i18n/useLocale';
import { SEO } from '../../components/SEO';
import { useAlert } from '../../context/alertStore';
import '../../styles/forum.css';
import { ROUTES, loginPath } from "../../router/paths";

export const ForumPage: React.FC = () => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState(''); 
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [expandedPosts, setExpandedPosts] = useState<string[]>([]);
  
  // ניהול חלוקת עמודים
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);

  // המלצות אישיות מבוססות היסטוריה
  const [recommendedPosts, setRecommendedPosts] = useState<{ _id: string; title: string }[]>([]);

  const navigate = useNavigate();
  const { showAlert } = useAlert();
  const { t } = useTranslation();
  const { dir, language } = useLocale();
  const userStr = localStorage.getItem('user');
  const currentUser = userStr ? JSON.parse(userStr) : null;
  const isAdmin = currentUser?.role === 'admin';

  const fetchPosts = (search: string = '', page: number = 1) => {
    setLoading(true);
    const userRole = currentUser?.role || 'user';

    fetchPostsFromApi(search, page, userRole)
      .then((res) => {
        if (!res.ok) throw new Error(t('forum.list.serverError'));
        return res.json();
      })
      .then((data) => {
        if (data && data.posts) {
          setPosts(data.posts);
          setCurrentPage(data.currentPage || page);
          setTotalPages(data.totalPages || 1);

          localStorage.setItem('user_posts_backup', JSON.stringify(data.posts.map((p: Post) => ({ _id: p._id, title: p.title }))));
        } else {
          setPosts(Array.isArray(data) ? data : []);
          setCurrentPage(1);
          setTotalPages(1);
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error('Error fetching posts:', err);
        setPosts([]); 
        setLoading(false);
      });
  };

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      fetchPosts(searchQuery, currentPage);
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery, currentPage]);

  // אפקט חכם המושך המלצות ומסנן כפילויות - מעודכן לשימוש ב-postId מהיר
  useEffect(() => {
    const userHistory = JSON.parse(localStorage.getItem('viewed_titles') || '[]');
    let targetTitle = '';

    if (userHistory.length > 0) {
      targetTitle = userHistory[0];
    } else if (posts.length > 0) {
      targetTitle = posts[0].title;
    }

    // שינוי: בניית ה-queryParam בצורה חכמה. עדיפות עליונה ל-postId של פוסט קיים למהירות שיא
    let queryParam = '';
    if (posts.length > 0) {
      queryParam = `postId=${posts[0]._id}`;
    } else if (targetTitle) {
      queryParam = `title=${encodeURIComponent(targetTitle)}`;
    }

    if (queryParam) {
      fetchSimilarPosts(queryParam)
        .then((res) => res.json())
        .then((data) => {
          if (Array.isArray(data)) {
            const currentPostIds = posts.map(p => p._id);
            
            // 1. סינון פוסטים שמוצגים כרגע בעמוד
            const filtered = data.filter((p: { _id: string }) => !currentPostIds.includes(p._id));

            // 2. מניעת כפילויות פנימיות
            const uniqueMap = new Map();
            filtered.forEach(p => uniqueMap.set(p._id, p));
            const finalRecommendations = Array.from(uniqueMap.values());

            // 3. מנגנון השלמה (Fallback): אם נשארו פחות מ-3 פוסטים לאחר הסינון,
            // ניקח פוסטים אחרים מהעמוד הנוכחי כדי להשלים לשלשה קבועה
            if (finalRecommendations.length < 3 && posts.length > 0) {
              for (const postItem of posts) {
                if (finalRecommendations.length >= 3) break;
                if (!finalRecommendations.some(r => r._id === postItem._id)) {
                  finalRecommendations.push({
                    _id: postItem._id,
                    title: postItem.title
                  });
                }
              }
            }

            // 4. חיתוך מדויק של 3 פוסטים בלבד
            setRecommendedPosts(finalRecommendations.slice(0, 3));
          } else {
            setRecommendedPosts([]);
          }
        })
        .catch((err) => console.error('Error fetching personalized recommendations:', err));
    }
  }, [posts]);

  const handleClearFilter = () => {
    setSearchQuery('');
    setCurrentPage(1);
    fetchPosts('', 1); 
  };

  const handlePageChange = (pageNumber: number) => {
    if (pageNumber < 1 || pageNumber > totalPages) return;
    setCurrentPage(pageNumber);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const toggleExpandPost = (e: React.MouseEvent, postId: string) => {
    e.stopPropagation(); 
    setExpandedPosts((prev) =>
      prev.includes(postId) ? prev.filter((id) => id !== postId) : [...prev, postId]
    );
  };

  const handleModeratePost = async (e: React.MouseEvent, postId: string, actionType: 'block' | 'unblock' | 'lock' | 'unlock') => {
    e.stopPropagation(); 
    if (!currentUser?._id) return showAlert(t('forum.list.notLoggedIn'), { type: 'error' });

    try {
      const response = await moderatePostApi(postId, actionType);

      if (response.ok) {
        fetchPosts(searchQuery, currentPage);
      } else {
        const errData = await response.json();
        showAlert(errData.message || t('forum.list.actionFailed'), { type: 'error' });
      }
    } catch (error) {
      console.error('Error moderating post:', error);
      showAlert(t('forum.errors.network'), { type: 'error' });
    }
  };

  return (
    <div className="forum-page" dir={dir}>
      <SEO
        title={t('forum.seo.title')}
        description={t('forum.seo.description')}
        keywords={t('forum.seo.keywords')}
        canonicalUrl="https://safeai613.com/forum"
      />

      <div className="forum-toolbar">
        <div className="forum-add-btn-wrapper">
        <button
          onClick={() => {
            if (currentUser) {
              setIsModalOpen(true);
            }
          }}
          disabled={!currentUser}
          title={!currentUser ? t('forum.list.loginToAddTitle') : ''}
          className={`forum-add-btn ${!currentUser ? "forum-add-btn-disabled" : ""}`}
        >
          {t('forum.list.addPost')}
        </button>
        {!currentUser && (
        <span className="forum-login-hint">
          <Trans i18nKey="forum.list.loginToAddHint" components={{ link: <Link to={loginPath(ROUTES.hub.forum)} /> }} />
        </span>
        )}
        </div>
        
        <div className="forum-search-wrap">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
            placeholder={t('forum.list.searchPlaceholder')}
            className="forum-search-input"
          />
          <i className="fa-solid fa-magnifying-glass forum-search-icon"></i>
        </div>
      </div>

      <div className="forum-header-row">
        <h2 className="forum-header-title">
          {searchQuery ? t('forum.list.searchResults', { query: searchQuery }) : t('forum.list.title')}
        </h2>
        {searchQuery && (
          <button
            onClick={handleClearFilter}
            className="forum-clear-filter-btn"
          >
            <i className="fa-solid fa-arrow-rotate-left"></i>
            {t('forum.list.backToFullList')}
          </button>
        )}
      </div>

      {loading ? (
        <div className="forum-loading">{t('forum.list.loading')}</div>
      ) : !Array.isArray(posts) || posts.length === 0 ? (
        <div className="forum-empty-state">
          <i className="fa-solid fa-folder-open forum-empty-icon"></i>
          <h3 className="forum-empty-title">{t('forum.list.emptyTitle')}</h3>
          <button onClick={handleClearFilter} className="forum-show-all-btn">
            {t('forum.list.showAll')}
          </button>
        </div>
      ) : (
        <>
          <div className="forum-list">
            {posts.map((post) => {
              const lineCount = post.content.split('\n').length;
              const isLongPost = post.content.length > 140 || lineCount > 6;
              const isExpanded = expandedPosts.includes(post._id);

              return (
                <div
                  key={post._id}
                  onClick={() => navigate(generatePath(ROUTES.hub.forumPost, { id: post._id }))}
                  className={`forum-card ${post.isBlocked ? 'forum-card-blocked' : ''}`}
                >
                  <div className={`forum-card-avatar-col ${post.isBlocked ? 'forum-card-avatar-col-blocked' : ''}`}>
                    {post.ratingCount > 0 && (
                      <div className="forum-card-rating-badge">
                        {t('forum.list.rating', { rating: post.averageRating })}
                      </div>
                    )}
                    <div className="forum-avatar-circle">
                      {post.author?.name?.charAt(0).toUpperCase() || 'U'}
                    </div>
                    <span className="forum-author-name">{post.author?.name}</span>
                  </div>

                  <div className="forum-card-body">
                    <div>
                      <div className="forum-card-meta-row">
                        <span className="forum-card-date">
                          {formatForumDate(post.createdAt, t, language)}
                        </span>
                        <span className="forum-card-stats">
                          {t('forum.list.stats', { views: post.viewsCount || 0, comments: post.commentCount || 0 })}
                        </span>
                      </div>

                      <div className="forum-tags-row">
                        <span className="forum-category-badge">{post.category}</span>
                        {post.isBlocked && <span className="forum-blocked-badge">{t('forum.list.blocked')}</span>}
                        {post.isLocked && <span className="forum-locked-badge">{t('forum.list.locked')}</span>}

                        <h3 className="forum-card-title">{post.title}</h3>
                        {post.tags && Array.isArray(post.tags) && post.tags.map((tag: string | { _id: string; name: string }) => {
                          const isTagObject = typeof tag === 'object' && tag !== null;
                          const tagName = isTagObject ? tag.name : tag;
                          const tagKey = isTagObject ? tag._id : tagName;
                          return (
                            <span key={tagKey} onClick={(e) => { e.stopPropagation(); setSearchQuery(tagName); setCurrentPage(1); }} className="forum-tag-chip">
                             {tagName}
                            </span>
                          );
                        })}
                      </div>

                      <div className="forum-card-content-wrap">
                        <p className="forum-card-excerpt">
                          {isLongPost && !isExpanded
                            ? post.content.split('\n').length > 6
                              ? post.content.split('\n').slice(0, 6).join('\n')
                              : `${post.content.substring(0, 140)}`
                            : post.content}
                        </p>
                        {isLongPost && (
                          <span
                            onClick={(e) => toggleExpandPost(e, post._id)}
                            className="forum-read-more"
                          >
                            {isExpanded ? t('forum.list.showLess') : t('forum.list.showMore')}
                          </span>
                        )}
                      </div>
                    </div>

                    {post.lastComment && (
                      <div onClick={(e) => { e.stopPropagation(); navigate(`${generatePath(ROUTES.hub.forumPost, { id: post._id })}?scroll=bottom`); }} className="forum-last-comment">
                        <div className="forum-last-comment-text">
                          <strong className="forum-last-comment-author">{post.lastComment.authorName}: </strong>
                          {(() => {
                            const stripHtml = (html: string) => {
                              if (!html) return '';
                              return html.replace(/<\/?[^>]+(>|$)/g, " ");
                            };
                            return stripHtml(post.lastComment.content).substring(0, 90);
                          })()}
                        </div>
                        <span className="forum-last-comment-link">
                          {t('forum.list.toLastComment')}
                        </span>
                      </div>
                    )}

                    <div className="forum-card-footer">
                      <div className="forum-card-actions">
                        {isAdmin && (
                          <>
                            <button
                              onClick={(e) => handleModeratePost(e, post._id, post.isBlocked ? 'unblock' : 'block')}
                              className={`forum-block-btn ${post.isBlocked ? 'forum-block-btn-active' : ''}`}
                            >
                              {post.isBlocked ? t('forum.list.unblock') : t('forum.list.block')}
                            </button>
                            <button
                              onClick={(e) => handleModeratePost(e, post._id, post.isLocked ? 'unlock' : 'lock')}
                              className="forum-lock-btn"
                            >
                              {post.isLocked ? t('forum.list.unlock') : t('forum.list.lock')}
                            </button>
                          </>
                        )}
                      </div>
                      <button
                        onClick={(e) => { e.stopPropagation(); navigate(generatePath(ROUTES.hub.forumPost, { id: post._id })); }}
                        className="forum-comments-btn"
                      >
                        {t('forum.list.allComments')}
                      </button>
                    </div>

                  </div>
                </div>
              );
            })}
          </div>

          {totalPages > 1 && (
            <div className="forum-pagination">
              <button
                disabled={currentPage === 1}
                onClick={() => handlePageChange(currentPage - 1)}
                className="forum-page-nav-btn"
              >
                {t('forum.list.previous')}
              </button>

              {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNumber) => (
                <button
                  key={pageNumber}
                  onClick={() => handlePageChange(pageNumber)}
                  className={`forum-page-num-btn ${currentPage === pageNumber ? 'forum-page-num-btn-active' : ''}`}
                >
                  {pageNumber}
                </button>
              ))}

              <button
                disabled={currentPage === totalPages}
                onClick={() => handlePageChange(currentPage + 1)}
                className="forum-page-nav-btn"
              >
                {t('forum.list.next')}
              </button>
            </div>
          )}

          {/* רכיב המלצות אישיות מבוסס AI עם מניעת כפילויות מלאה */}
          {recommendedPosts.length > 0 && (
            <div className="forum-recommendations">
              <h3 className="forum-recommendations-title">
                <i className="fa-solid fa-wand-magic-sparkles forum-recommendations-icon"></i>
                {t('forum.list.recommendationsTitle')}
              </h3>
              <div className="forum-recommendations-list">
                {recommendedPosts.map((p) => (
                  <div
                    key={p._id}
                    onClick={() => {
                      navigate(generatePath(ROUTES.hub.forumPost, { id: p._id }));
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    className="forum-recommendation-card"
                  >
                    <span className="forum-recommendation-title">
                      {p.title}
                    </span>
                    <span className="forum-recommendation-link">{t('forum.list.readMore')}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      <AddPostModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onPostCreated={() => fetchPosts(searchQuery, currentPage)} />
    </div>
  );
};

export default ForumPage;