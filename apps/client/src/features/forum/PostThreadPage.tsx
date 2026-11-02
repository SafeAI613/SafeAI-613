import React, { useEffect, useState, useRef } from 'react';
import { Link, generatePath, useLocation, useNavigate, useParams } from 'react-router-dom';
import { useEditor, EditorContent } from '@tiptap/react';
import { Trans, useTranslation } from 'react-i18next';
import StarterKit from '@tiptap/starter-kit';
import { TextStyle } from '@tiptap/extension-text-style';
import { Color } from '@tiptap/extension-color';
import { Highlight } from '@tiptap/extension-highlight';
import { FontFamily } from '@tiptap/extension-font-family';
import { TextAlign } from '@tiptap/extension-text-align';
import Placeholder from '@tiptap/extension-placeholder';
import {
  fetchPostById,
  fetchSimilarPosts,
  incrementPostView,
  deleteComment,
  getUploadUrl,
  uploadFileViaPresignedPost,
  createComment,
  ratePost,
} from './api';
import { validateFileForUpload } from './uploadValidation';
import type { Post, Comment } from './types';
import { formatForumDate } from './formatForumDate';
import { useLocale } from '../../i18n/useLocale';
import { SEO } from '../../components/SEO';
import { useAlert } from '../../context/alertStore';
import '../../styles/forum.css';
import { ROUTES, loginPath } from "../../router/paths";
import DOMPurify from 'dompurify';

// Builds a meta description of roughly 160 characters, without cutting a
// word in half - post.content is plain text (rendered unescaped as a React
// child elsewhere on this page), so no HTML stripping is needed here.
const buildMetaDescription = (content: string): string => {
  const trimmed = content.trim();
  if (trimmed.length <= 160) return trimmed;
  return trimmed.slice(0, 160).replace(/\s+\S*$/, '') + '...';
};

export const PostThreadPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { showAlert } = useAlert();
  const { t } = useTranslation();
  const { dir, language } = useLocale();
  const [post, setPost] = useState<Post | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [commentLoading, setCommentLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [userRating, setUserRating] = useState<number>(0);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const commentFileInputRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const [similarPosts, setSimilarPosts] = useState<{ _id: string; title: string }[]>([]);

  const currentUserStr = localStorage.getItem('user');
  const currentUser = currentUserStr ? JSON.parse(currentUserStr) : null;
  const currentUserInitial = currentUser?.name?.charAt(0).toUpperCase() || 'U';
  const isAdmin = currentUser?.role === 'admin';
  const isCommentBlocked = !isAdmin && currentUser?.canComment === false;

  const editor = useEditor({
    extensions: [
      StarterKit,
      TextStyle,
      Color,
      FontFamily,
      Highlight.configure({ multicolor: true }),
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Placeholder.configure({
        placeholder: t('forum.thread.editorPlaceholder'),
        emptyEditorClass: 'is-editor-empty',
      }),
    ],
    content: '',
  });

  const loadPostAndComments = () => {
    if (!id) return;
    fetchPostById(id)
      .then((res) => res.json())
      .then((data) => {
        setPost(data.post);
        setComments(data.comments || []);
        setLoading(false);

        if (data.post && data.post.title) {
          const currentTitle = data.post.title;
          
          const existingHistory = JSON.parse(localStorage.getItem('viewed_titles') || '[]');
          const updatedHistory = existingHistory.filter((title: string) => title !== currentTitle);
          updatedHistory.unshift(currentTitle);
          if (updatedHistory.length > 5) updatedHistory.pop();
          localStorage.setItem('viewed_titles', JSON.stringify(updatedHistory));

          // שימוש בפרמטר postId המהיר ב-100% מול ה-Backend
          fetchSimilarPosts(`postId=${data.post._id}`)
            .then((res) => res.json())
            .then((similarData) => {
              if (Array.isArray(similarData)) {
                const filtered = similarData.filter((p: { _id: string }) => p._id !== data.post._id);

                const uniqueMap = new Map();
                filtered.forEach(p => uniqueMap.set(p._id, p));
                const finalSimilar = Array.from(uniqueMap.values());

                if (finalSimilar.length < 3) {
                  const backupPosts = JSON.parse(localStorage.getItem('user_posts_backup') || '[]');
                  for (const fallbackItem of backupPosts) {
                    if (finalSimilar.length >= 3) break;
                    if (fallbackItem._id !== data.post._id && !finalSimilar.some(r => r._id === fallbackItem._id)) {
                      finalSimilar.push({
                        _id: fallbackItem._id,
                        title: fallbackItem.title
                      });
                    }
                  }
                }

                setSimilarPosts(finalSimilar.slice(0, 3));
              } else {
                setSimilarPosts([]);
              }
            })
            .catch((err) => console.error('Error fetching similar posts:', err));
        }
      })
      .catch((err) => {
        console.error('Error fetching post thread:', err);
        setLoading(false);
      });
  };

  useEffect(() => {
    if (!id) return;

    loadPostAndComments();

    const searchParams = new URLSearchParams(location.search);
    if (searchParams.get('scroll') === 'bottom') {
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'auto' }), 300);
    }

    const userStr = localStorage.getItem('user');
    const user = userStr ? JSON.parse(userStr) : null;

    if (user) {
      incrementPostView(id, user._id)
        .then((res) => res.json())
        .then((viewData) => {
          if (viewData && viewData.viewsCount !== undefined) {
            setPost((prev) => prev ? { ...prev, viewsCount: viewData.viewsCount } : null);
          }
        })
        .catch((err) => console.error('Error incrementing view:', err));
    }
  }, [id, location.search]);

  const handleDeleteComment = async (commentId: string) => {
    if (!window.confirm(t('forum.thread.confirmDelete'))) return;

    try {
      const response = await deleteComment(commentId);

      if (response.ok) {
        setComments((prev) => prev.filter((comment) => comment._id !== commentId));
      } else {
        const errData = await response.json();
        showAlert(errData.message || t('forum.thread.deleteFailed'), { type: 'error' });
      }
    } catch (err) {
      console.error('Error deleting comment:', err);
      showAlert(t('forum.errors.network'), { type: 'error' });
    }
  };

  const handleCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editor) return;

    const htmlContent = editor.getHTML();
    if (!htmlContent || htmlContent === '<p></p>' || commentLoading) return;

    setCommentLoading(true);
    let finalFileUrl = "";

    if (selectedFile) {
      try {
        const urlResponse = await getUploadUrl(selectedFile.name, selectedFile.type, {
          fileSize: selectedFile.size,
          context: 'comment',
        });

        if (!urlResponse.ok) {
          const errData = await urlResponse.json().catch(() => null);
          throw new Error(errData?.error || t('forum.thread.uploadUrlFailed'));
        }
        const { url, fields, fileUrl } = await urlResponse.json();

        const awsResponse = await uploadFileViaPresignedPost(url, fields, selectedFile);

        if (!awsResponse.ok) throw new Error(t('forum.thread.s3Failed'));
        finalFileUrl = fileUrl;

      } catch (error) {
        console.error('Error uploading comment file to S3:', error);
        showAlert(t('forum.thread.uploadFailed'), { type: 'error' });
        setCommentLoading(false);
        return;
      }
    }

    const commentPayload = {
      postId: id || '',
      content: htmlContent,
      fileUrl: finalFileUrl,
      userId: currentUser?._id
    };

    try {
      const response = await createComment(id, commentPayload);

      if (response.ok) {
        const savedComment = await response.json();
        setComments((prevComments) => [...prevComments, savedComment]);
        editor.commands.clearContent();
        setSelectedFile(null);
        navigate(ROUTES.hub.forum);
      } else {
        const errData = await response.json();
        showAlert(t('forum.thread.serverError', { message: errData.message || t('forum.thread.saveFailed') }), { type: 'error' });
      }
    } catch (err) {
      console.error('Error submitting comment:', err);
    } finally {
      setCommentLoading(false);
    }
  };

  const handleCommentFileSelect = async (file: File | null) => {
    if (!file) {
      setSelectedFile(null);
      return;
    }

    const error = await validateFileForUpload(file, 'comment');
    if (error) {
      showAlert(error, { type: 'error' });
      if (commentFileInputRef.current) commentFileInputRef.current.value = '';
      setSelectedFile(null);
      return;
    }

    setSelectedFile(file);
  };

  const handleStarClick = async (selectedRating: number) => {
    if (!post || !currentUser) return;
    setUserRating(selectedRating);

    try {
      const response = await ratePost(post._id, selectedRating);

      if (response.ok) {
        const data = await response.json();
        setPost((prev) => prev ? { ...prev, averageRating: data.averageRating, ratingCount: data.ratingCount } : null);
      }
    } catch (error) {
      console.error('Failed to save rating:', error);
    }
  };

  const renderFileAttachment = (fileUrl: string, index: number) => {
    if (!fileUrl) return null;
    
    // 1. פיענוח תווים מיוחדים בעברית (הופך %D7%A5 וכדומה לאותיות אמיתיות)
    const cleanPath = decodeURIComponent(fileUrl.split('?')[0]);
    let fileName = cleanPath.split('/').pop() || t('forum.thread.attachment.defaultName');
    const fileExtension = fileName.split('.').pop()?.toLowerCase() || '';

    // 2. חילוץ השם המקורי בצורה בטוחה: 
    // אם יש קו תחתון (_) או מיקוף (-) ושם הקובץ ארוך מאוד (כמו במקרה של GUID או Timestamp של S3)
    if (fileName.length > 30) {
      if (fileName.includes('_')) {
        // לוקח את כל מה שמופיע אחרי הקו התחתון הראשון
        fileName = fileName.substring(fileName.indexOf('_') + 1);
      } else if (fileName.includes('-')) {
        // לוקח את החלק האחרון אחרי המיקופים של ה-GUID
        const parts = fileName.split('-');
        if (parts.length > 4) {
          fileName = parts.slice(4).join('-');
        }
      }
    }

    // 3. הגנה חיונית: אם החיתוך השתבש והשאיר שם ריק או רק את הסיומת, נחזיר את השם המקורי לפני החיתוך
    if (!fileName || fileName.startsWith('.') || fileName === fileExtension) {
      fileName = cleanPath.split('/').pop() || t('forum.thread.attachment.defaultName');
    }

    // 4. הגבלת אורך תצוגה אסתטית (למשל: document...docx)
    if (fileName.length > 25) {
      const nameWithoutExtension = fileName.substring(0, fileName.lastIndexOf('.'));
      fileName = `${nameWithoutExtension.substring(0, 12)}...${nameWithoutExtension.slice(-4)}.${fileExtension}`;
    }

    const isImage = ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(fileExtension);

    if (isImage) {
      return (
        <div
          key={index}
          onClick={() => window.open(fileUrl, '_blank')}
          title={t('forum.thread.attachment.enlarge')}
          className="forum-attachment-image"
        >
          <img src={fileUrl} alt={t('forum.thread.attachment.preview')} className="forum-attachment-image-img" />
        </div>
      );
    }

    let iconClass = 'fa-solid fa-file';
    let iconColor = 'var(--text-muted)';

    if (fileExtension === 'pdf') {
      iconClass = 'fa-solid fa-file-pdf';
      iconColor = 'var(--color-danger)';
    } else if (['doc', 'docx'].includes(fileExtension)) {
      iconClass = 'fa-solid fa-file-word';
      iconColor = 'var(--link-color)';
    } else if (['xls', 'xlsx'].includes(fileExtension)) {
      iconClass = 'fa-solid fa-file-excel';
      iconColor = 'var(--brand-secondary)';
    } else if (['zip', 'rar', '7z'].includes(fileExtension)) {
      iconClass = 'fa-solid fa-file-zipper';
      iconColor = 'var(--color-warning)';
    } else if (['ts', 'tsx', 'js', 'jsx', 'html', 'css', 'json'].includes(fileExtension)) {
      iconClass = 'fa-solid fa-file-code';
      iconColor = 'var(--brand-hub)';
    }

    return (
      <div
        key={index}
        className="forum-attachment-file"
      >
        <i className={`${iconClass} forum-attachment-icon`} style={{ color: iconColor }}></i>

        <div className="forum-attachment-info">
          <span
            className="forum-attachment-filename"
            title={fileName}
          >
            {fileName}
          </span>
          <span className="forum-attachment-filetype">{t('forum.thread.attachment.fileType', { ext: fileExtension })}</span>
        </div>

        <a
          href={fileUrl}
          target="_blank"
          rel="noreferrer"
          download={fileName}
          className="forum-attachment-download"
        >
          <i className="fa-solid fa-download"></i>
          {t('forum.thread.attachment.download')}
        </a>
      </div>
    );
  };

  if (loading) return <div className="forum-thread-loading" dir={dir}>{t('forum.thread.loading')}</div>;
  if (!post) return <div className="forum-thread-not-found" dir={dir}>{t('forum.thread.notFound')}</div>;

  const firstImageAttachment = post.attachments?.find((url) =>
    ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(
      url.split('?')[0].split('.').pop()?.toLowerCase() || ''
    )
  );
  const postKeywords = post.tags
    ?.map((tag) => (typeof tag === 'string' ? tag : tag.name))
    .join(', ');

  return (
    <div className="forum-thread-page" dir={dir}>
      <SEO
        title={post.title}
        description={buildMetaDescription(post.content)}
        keywords={postKeywords}
        canonicalUrl={`https://safeai613.com/forum/post/${post._id}`}
        ogImage={firstImageAttachment}
        noIndex={!!post.isLocked}
      />

      <button
        onClick={() => navigate(ROUTES.hub.forum)}
        className="forum-back-btn"
      >
        {t('forum.thread.back')}
      </button>

      <div className="forum-post-card">
        <div className="forum-post-avatar-col">
          <div className="forum-post-avatar-circle">
            {post.author?.name?.charAt(0).toUpperCase() || 'U'}
          </div>
          <span className="forum-post-author-name">
            {post.author?.name || t('forum.thread.systemUser')}
          </span>
        </div>

        <div className="forum-post-body">
          <div>
            <div className="forum-post-meta-row">
              <span className="forum-post-meta-text">
                {formatForumDate(post.createdAt, t, language)}
              </span>
              <span className="forum-post-meta-text">
                {t('forum.thread.views', { views: post.viewsCount })}
              </span>
            </div>

            <div className="forum-post-badges-row">
              <span className="forum-post-category-badge">
                {post.category}
              </span>
              {post.isLocked && (
                <span className="forum-post-locked-badge">
                  {t('forum.thread.locked')}
                </span>
              )}
              <h1 className="forum-post-title">{post.title}</h1>
            </div>

            <p className="forum-post-content">
              {post.content}
            </p>
          </div>

          <div className="forum-post-footer-row">
            {post.tags && post.tags.length > 0 && (
              <div className="forum-post-tags-list">
                {post.tags.map((tag: string | { name: string }, idx) => {
                  const tagName = typeof tag === 'object' && tag !== null ? tag.name : tag;
                  return (
                    <span key={idx} className="forum-post-tag-chip">
                      #{tagName}
                    </span>
                  );
                })}
              </div>
            )}

           {post.attachments && post.attachments.length > 0 && (
              <div className="forum-post-attachments-list">
                {post.attachments.map((file, index) => renderFileAttachment(file, index))}
              </div>
            )}
          </div>
        </div>
      </div>
      {currentUser && (     
      <div className="forum-rating-row">
        <span className="forum-rating-label">{t('forum.thread.ratingLabel')}</span>
        <div className="forum-stars-row">
          {[1, 2, 3, 4, 5].map((star) => {
            const isFilled = star <= (hoverRating || userRating);
            return (
              <span
                key={star}
                onClick={() => handleStarClick(star)}
                onMouseEnter={() => setHoverRating(star)}
                onMouseLeave={() => setHoverRating(0)}
                className={`forum-star ${isFilled ? 'forum-star-filled' : ''}`}
                title={t('forum.thread.starLabel', { star })}
              >
                ★
              </span>
            );
          })}
        </div>
        <span className="forum-rating-summary">
          {t('forum.thread.ratingSummary', { average: post.averageRating || 0, raters: post.ratingCount || 0 })}
        </span>
      </div>
      )}

      {comments.length > 0 && (
        <div className="forum-comments-list">
          {comments.map((comment, index) => {
            const commenterInitial = comment.author?.name?.charAt(0).toUpperCase() || 'U';
            return (
              <div
                key={comment._id}
                className={`forum-comment-item ${index === comments.length - 1 ? 'forum-comment-item-last' : ''} ${index % 2 !== 0 ? 'forum-comment-item-odd' : ''}`}
              >
                <div className="forum-comment-avatar-col">
                  <div className="forum-comment-avatar-circle">
                    {commenterInitial}
                  </div>
                  <small className="forum-comment-author-name">
                    {comment.author?.name || t('forum.thread.anonymousUser')}
                  </small>
                </div>

                <div className="forum-comment-body">
                  <div className="forum-comment-header-row">
                    <div className="forum-comment-date">
                      {formatForumDate(comment.createdAt, t, language)}
                    </div>

                    {isAdmin && (
                      <button
                        onClick={() => handleDeleteComment(comment._id)}
                        title={t('forum.thread.deleteTitle')}
                        className="forum-comment-delete-btn"
                      >
                        <i className="fa-solid fa-trash-can"></i>
                        {t('forum.thread.delete')}
                      </button>
                    )}
                  </div>

                  <div
                    // ניקוי גם בצד הלקוח: מגן גם על תגובות ישנות שנשמרו לפני שהשרת התחיל לנקות HTML
                    dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(comment.content) }}
                    className="forum-comment-content"
                  />

                {comment.attachments && comment.attachments.length > 0 && (
                    <div className="forum-comment-attachments-list">
                      {comment.attachments.map((file, idx) => renderFileAttachment(file, idx))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div ref={bottomRef} />

      {post.isLocked ? (
        <div className="forum-locked-notice">
          <i className="fa-solid fa-lock forum-locked-icon"></i>
          <span>{t('forum.thread.lockedNotice')}</span>
        </div>
      ) : !currentUser ? (
       <div className="forum-unauthorized-notice">
        <span><Trans i18nKey="forum.thread.loginToComment" components={{ link: <Link to={loginPath(location.pathname)} className="forum-login-link" /> }} /></span>
      </div>
      ) : (
        <div className="forum-comment-form-wrap">
          <div className="forum-comment-form-avatar-col">
            <div className="forum-comment-form-avatar-circle">
              {currentUserInitial}
            </div>
            <small className="forum-comment-form-username">
              {currentUser?.name || t('forum.thread.you')}
            </small>
          </div>

          <form
            onSubmit={handleCommentSubmit}
            className="forum-comment-form"
          >
            {editor && (
              <div className="forum-editor-toolbar">
                <select 
                  onChange={(e) => editor.chain().focus().setFontFamily(e.target.value).run()}
                  className="forum-editor-select"
                  aria-label={t('forum.thread.editor.fontFamily')}
                >
                  <option value="Arial">Sans Serif (Arial)</option>
                  <option value="Courier New">Fixed Width</option>
                  <option value="Times New Roman">Serif</option>
                </select>

                <select
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === 'p') editor.chain().focus().setParagraph().run();
                    else editor.chain().focus().toggleHeading({ level: Number(val) as 1 | 2 | 3 | 4 | 5 | 6 }).run();
                  }}
                  className="forum-editor-select"
                  aria-label={t('forum.thread.editor.blockType')}
                >
                  <option value="p">{t('forum.thread.editor.paragraph')}</option>
                  <option value="3">{t('forum.thread.editor.headingSmall')}</option>
                  <option value="2">{t('forum.thread.editor.headingMedium')}</option>
                  <option value="1">{t('forum.thread.editor.headingLarge')}</option>
                </select>

                <div className="forum-editor-divider" />

                <button
                  type="button"
                  onClick={() => editor.chain().focus().toggleBold().run()}
                  title={t('forum.thread.editor.bold')}
                  className={`forum-editor-btn forum-editor-btn-text forum-editor-btn-bold ${editor.isActive('bold') ? 'forum-editor-btn-active' : ''}`}
                >
                  B
                </button>
                <button
                  type="button"
                  onClick={() => editor.chain().focus().toggleItalic().run()}
                  title={t('forum.thread.editor.italic')}
                  className={`forum-editor-btn forum-editor-btn-text forum-editor-btn-italic ${editor.isActive('italic') ? 'forum-editor-btn-active' : ''}`}
                >
                  I
                </button>
                <button
                  type="button"
                  onClick={() => editor.chain().focus().toggleStrike().run()}
                  title={t('forum.thread.editor.strike')}
                  className={`forum-editor-btn forum-editor-btn-text forum-editor-btn-strike ${editor.isActive('strike') ? 'forum-editor-btn-active' : ''}`}
                >
                  S
                </button>

                <div className="forum-editor-divider" />

                <select
                  onChange={(e) => editor.chain().focus().setColor(e.target.value).run()}
                  className="forum-editor-select-plain"
                  aria-label={t('forum.thread.editor.textColor')}
                >
                  <option value="#374151">{t('forum.thread.editor.colorBlack')}</option>
                  <option value="#10b981">{t('forum.thread.editor.colorGreen')}</option>
                  <option value="#2563eb">{t('forum.thread.editor.colorBlue')}</option>
                  <option value="#ef4444">{t('forum.thread.editor.colorRed')}</option>
                </select>

                <select
                  onChange={(e) => {
                    if (e.target.value === 'none') editor.chain().focus().unsetHighlight().run();
                    else editor.chain().focus().toggleHighlight({ color: e.target.value }).run();
                  }}
                  className="forum-editor-select-plain"
                  aria-label={t('forum.thread.editor.highlight')}
                >
                  <option value="none">{t('forum.thread.editor.highlightNone')}</option>
                  <option value="#fef08a">{t('forum.thread.editor.highlightYellow')}</option>
                  <option value="#bbf7d0">{t('forum.thread.editor.highlightLightGreen')}</option>
                  <option value="#bfdbfe">{t('forum.thread.editor.highlightLightBlue')}</option>
                </select>

                <div className="forum-editor-divider" />

                <button
                  type="button"
                  onClick={() => editor.chain().focus().setTextAlign('right').run()}
                  title={t('forum.thread.editor.alignRight')}
                  aria-label={t('forum.thread.editor.alignRight')}
                  className={`forum-editor-btn forum-editor-btn-align ${editor.isActive({ textAlign: 'right' }) ? 'forum-editor-btn-active' : ''}`}
                >
                  ➡️
                </button>
                <button
                  type="button"
                  onClick={() => editor.chain().focus().setTextAlign('center').run()}
                  title={t('forum.thread.editor.alignCenter')}
                  aria-label={t('forum.thread.editor.alignCenter')}
                  className={`forum-editor-btn forum-editor-btn-align ${editor.isActive({ textAlign: 'center' }) ? 'forum-editor-btn-active' : ''}`}
                >
                  ↔️
                </button>
                <button
                  type="button"
                  onClick={() => editor.chain().focus().setTextAlign('left').run()}
                  title={t('forum.thread.editor.alignLeft')}
                  aria-label={t('forum.thread.editor.alignLeft')}
                  className={`forum-editor-btn forum-editor-btn-align ${editor.isActive({ textAlign: 'left' }) ? 'forum-editor-btn-active' : ''}`}
                >
                  ⬅️
                </button>

                <div className="forum-editor-divider" />

                <button
                  type="button"
                  onClick={() => editor.chain().focus().toggleBulletList().run()}
                  className={`forum-editor-btn forum-editor-btn-text ${editor.isActive('bulletList') ? 'forum-editor-btn-active' : ''}`}
                >
                  {t('forum.thread.editor.bulletList')}
                </button>
                <button
                  type="button"
                  onClick={() => editor.chain().focus().toggleOrderedList().run()}
                  className={`forum-editor-btn forum-editor-btn-text ${editor.isActive('orderedList') ? 'forum-editor-btn-active' : ''}`}
                >
                  {t('forum.thread.editor.orderedList')}
                </button>
              </div>
            )}

            {selectedFile && (
              <div className="forum-selected-file-banner">
                <i className="fa-solid fa-circle-check forum-selected-file-icon"></i>
                <span><Trans i18nKey="forum.thread.fileReady" values={{ name: selectedFile.name }} components={{ strong: <strong /> }} /></span>
                <button type="button" onClick={() => setSelectedFile(null)} className="forum-remove-file-btn">{t('forum.thread.removeFile')}</button>
              </div>
            )}

            <div
              onClick={() => editor?.commands.focus()}
              className="forum-editor-content-wrap"
            >
              <EditorContent editor={editor} />
            </div>

            <div className="forum-comment-form-footer">
              <button
                type="submit"
                disabled={commentLoading || isCommentBlocked}
                title={isCommentBlocked ? t('forum.thread.noPermission') : undefined}
                className="forum-comment-submit-btn"
              >
                {commentLoading ? t('forum.thread.saving') : t('forum.thread.submit')}
              </button>
              
              <input type="file" ref={commentFileInputRef} className="forum-file-input-hidden" onChange={(e) => handleCommentFileSelect(e.target.files?.[0] || null)} />
              <button type="button" onClick={() => commentFileInputRef.current?.click()} className="forum-attach-comment-btn">
                <i className="fa-solid fa-paperclip"></i> {t('forum.thread.attach')}
              </button>
            </div>
          </form>
        </div>
      )}

      {similarPosts.length > 0 && (
        <div className="forum-thread-recommendations">
          <h3 className="forum-thread-recommendations-title">
            <i className="fa-solid fa-circle-nodes forum-thread-recommendations-icon"></i>
            {t('forum.thread.similarTitle')}
          </h3>
          <div className="forum-thread-recommendations-grid">
            {similarPosts.map((p) => (
              <div
                key={p._id}
                onClick={() => {
                  navigate(generatePath(ROUTES.hub.forumPost, { id: p._id }));
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className="forum-thread-recommendation-card"
              >
                <h4 className="forum-thread-recommendation-title">{p.title}</h4>
                <span className="forum-thread-recommendation-link">{t('forum.thread.continueThread')}</span>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
};

export default PostThreadPage;