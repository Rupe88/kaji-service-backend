'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { trainingApi } from '@/lib/api-client';
import { Button } from '@/components/ui/Button';
import toast from 'react-hot-toast';

interface CommentUser {
  id: string;
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  profileImage?: string | null;
}

interface Comment {
  id: string;
  courseId: string;
  userId: string;
  parentId?: string | null;
  content: string;
  isEdited: boolean;
  createdAt: string;
  updatedAt: string;
  user: CommentUser;
  replies?: Comment[];
}

interface CourseCommentsProps {
  courseId: string;
}

export const CourseComments: React.FC<CourseCommentsProps> = ({ courseId }) => {
  const { user } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');

  useEffect(() => {
    fetchComments();
  }, [courseId]);

  const fetchComments = async () => {
    try {
      setLoading(true);
      const response = await trainingApi.getComments(courseId);
      setComments(response.data || []);
    } catch (error: any) {
      // Silently handle errors - no comments yet is expected
      console.log('Comments not available yet or error loading:', error);
      setComments([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitComment = async () => {
    if (!user?.id || !newComment.trim()) return;

    try {
      setSubmitting(true);
      await trainingApi.createComment({
        courseId,
        userId: user.id,
        content: newComment.trim(),
      });
      setNewComment('');
      toast.success('Comment posted!');
      fetchComments();
    } catch (error: any) {
      console.error('Error posting comment:', error);
      toast.error(error.response?.data?.message || 'Failed to post comment');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReply = async (parentId: string) => {
    if (!user?.id || !replyContent.trim()) return;

    try {
      setSubmitting(true);
      await trainingApi.createComment({
        courseId,
        userId: user.id,
        parentId,
        content: replyContent.trim(),
      });
      setReplyContent('');
      setReplyingTo(null);
      toast.success('Reply posted!');
      fetchComments();
    } catch (error: any) {
      console.error('Error posting reply:', error);
      toast.error(error.response?.data?.message || 'Failed to post reply');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateComment = async (id: string) => {
    if (!editContent.trim()) return;

    try {
      setSubmitting(true);
      await trainingApi.updateComment(id, editContent.trim());
      setEditingId(null);
      setEditContent('');
      toast.success('Comment updated!');
      fetchComments();
    } catch (error: any) {
      console.error('Error updating comment:', error);
      toast.error(error.response?.data?.message || 'Failed to update comment');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteComment = async (id: string) => {
    if (!confirm('Are you sure you want to delete this comment?')) return;

    try {
      setSubmitting(true);
      await trainingApi.deleteComment(id);
      toast.success('Comment deleted!');
      fetchComments();
    } catch (error: any) {
      console.error('Error deleting comment:', error);
      toast.error(error.response?.data?.message || 'Failed to delete comment');
    } finally {
      setSubmitting(false);
    }
  };

  const getUserName = (commentUser: CommentUser) => {
    if (commentUser.firstName || commentUser.lastName) {
      return `${commentUser.firstName || ''} ${commentUser.lastName || ''}`.trim();
    }
    return commentUser.email.split('@')[0];
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const renderComment = (comment: Comment, depth: number = 0) => {
    const isOwner = user?.id === comment.userId;
    const isEditing = editingId === comment.id;

    return (
      <div
        key={comment.id}
        className={`mb-4 ${depth > 0 ? 'ml-8 border-l-2 pl-4' : ''}`}
        style={{
          borderColor: depth > 0 ? 'oklch(0.7 0.15 180 / 0.2)' : 'transparent',
        }}
      >
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-full bg-teal-500/20 flex items-center justify-center flex-shrink-0">
            {comment.user.profileImage ? (
              <img
                src={comment.user.profileImage}
                alt={getUserName(comment.user)}
                className="w-10 h-10 rounded-full object-cover"
              />
            ) : (
              <span className="text-teal-400 font-semibold">
                {getUserName(comment.user).charAt(0).toUpperCase()}
              </span>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-semibold text-white">{getUserName(comment.user)}</span>
              <span className="text-xs text-gray-500">
                {formatDate(comment.createdAt)}
                {comment.isEdited && <span className="ml-1">(edited)</span>}
              </span>
            </div>
            {isEditing ? (
              <div className="space-y-2">
                <textarea
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  className="w-full p-2 rounded-lg bg-gray-800/50 border border-gray-700 text-white focus:outline-none focus:border-teal-500"
                  rows={3}
                  placeholder="Edit your comment..."
                />
                <div className="flex gap-2">
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => handleUpdateComment(comment.id)}
                    disabled={submitting || !editContent.trim()}
                  >
                    Save
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setEditingId(null);
                      setEditContent('');
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <p className="text-gray-300 whitespace-pre-wrap break-words">{comment.content}</p>
                <div className="flex items-center gap-3 mt-2">
                  {depth < 2 && (
                    <button
                      onClick={() => {
                        setReplyingTo(replyingTo === comment.id ? null : comment.id);
                        setReplyContent('');
                      }}
                      className="text-sm text-teal-400 hover:text-teal-300 transition-colors"
                    >
                      {replyingTo === comment.id ? 'Cancel' : 'Reply'}
                    </button>
                  )}
                  {isOwner && (
                    <>
                      <button
                        onClick={() => {
                          setEditingId(comment.id);
                          setEditContent(comment.content);
                        }}
                        className="text-sm text-gray-400 hover:text-gray-300 transition-colors"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteComment(comment.id)}
                        className="text-sm text-red-400 hover:text-red-300 transition-colors"
                      >
                        Delete
                      </button>
                    </>
                  )}
                </div>
                {replyingTo === comment.id && (
                  <div className="mt-3 space-y-2">
                    <textarea
                      value={replyContent}
                      onChange={(e) => setReplyContent(e.target.value)}
                      className="w-full p-2 rounded-lg bg-gray-800/50 border border-gray-700 text-white focus:outline-none focus:border-teal-500"
                      rows={2}
                      placeholder="Write a reply..."
                    />
                    <div className="flex gap-2">
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => handleReply(comment.id)}
                        disabled={submitting || !replyContent.trim()}
                      >
                        Post Reply
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setReplyingTo(null);
                          setReplyContent('');
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
        {comment.replies && comment.replies.length > 0 && (
          <div className="mt-4">
            {comment.replies.map((reply) => renderComment(reply, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-teal-400"></div>
        <p className="text-gray-400 mt-2">Loading comments...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-white">Discussion</h2>

      {/* New Comment Form */}
      {user ? (
        <div className="space-y-3">
          <textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            className="w-full p-3 rounded-lg bg-gray-800/50 border border-gray-700 text-white focus:outline-none focus:border-teal-500"
            rows={4}
            placeholder="Share your thoughts..."
          />
          <div className="flex justify-end">
            <Button
              variant="primary"
              onClick={handleSubmitComment}
              disabled={submitting || !newComment.trim()}
            >
              {submitting ? 'Posting...' : 'Post Comment'}
            </Button>
          </div>
        </div>
      ) : (
        <div className="p-4 rounded-lg bg-gray-800/50 border border-gray-700 text-center">
          <p className="text-gray-400">Please log in to join the discussion</p>
        </div>
      )}

      {/* Comments List */}
      <div className="space-y-4">
        {comments.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <p>No comments yet. Be the first to comment!</p>
          </div>
        ) : (
          comments.map((comment) => renderComment(comment))
        )}
      </div>
    </div>
  );
};

