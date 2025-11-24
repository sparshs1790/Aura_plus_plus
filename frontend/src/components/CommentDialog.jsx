import React, { useEffect, useMemo, useState } from 'react'
import { Dialog, DialogContent, DialogTrigger, DialogTitle, DialogDescription } from './ui/dialog'
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar'
import { Link } from 'react-router-dom'
import { MoreHorizontal, ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from './ui/button'
import { useDispatch, useSelector } from 'react-redux'
import Comment from './Comment'
import axios from 'axios'
import { toast } from 'sonner'
import { setPosts, setSelectedPost } from '@/redux/postSlice'
import { motion, AnimatePresence } from "framer-motion";

const CommentDialog = ({ open, setOpen, scopePosts }) => {
  const [text, setText] = useState("");
  const { selectedPost, posts } = useSelector(store => store.post);
  const [comment, setComment] = useState([]);
  const [direction, setDirection] = useState(0); // -1 left, +1 right for slide transitions
   const { user } = useSelector(store => store.auth);
  const dispatch = useDispatch();
 const url = import.meta.env.VITE_URL || 'http://localhost:5000';
 
  // Use scoped posts when provided (e.g. profile view), otherwise fall back to global posts
  // Normalize navPosts so each entry is a full post object. scopePosts may be an array of post objects
  // or an array of post IDs (e.g. bookmarks). For ID entries we look up the full post in the global `posts`.
  const rawNav = Array.isArray(scopePosts) ? scopePosts : posts;
  const navPosts = useMemo(() => (
    rawNav
      .map(item => {
        if (!item) return null;
        if (typeof item === 'object' && item._id) return item;
        if (typeof item === 'string') {
          const match = posts.find(p => String(p._id) === String(item));
          return match || null;
        }
        return null;
      })
      .filter(Boolean)
  ), [rawNav, posts]);

  // Track current index within navPosts so navigation stays scoped and stable
  const [currentIndex, setCurrentIndex] = useState(-1);

  useEffect(() => {
    if (!selectedPost || !navPosts.length) {
      setCurrentIndex(-1);
      return;
    }
    const idx = navPosts.findIndex(item => String(item._id) === String(selectedPost._id));
    setCurrentIndex(idx);
  }, [selectedPost, navPosts]);

  const canNavigate = navPosts.length > 1 && currentIndex !== -1;

  // Circular navigation: move left/right and wrap using modular arithmetic
  const goToAdjacentPost = (direction) => {
    const len = navPosts?.length || 0;
    if (len < 2 || currentIndex === -1) return;
    const delta = direction === 'left' ? -1 : 1;
    setDirection(delta);
    const newIdx = (currentIndex + delta + len) % len; // wrap-around
    const newPost = navPosts[newIdx];
    // Update selected post in redux so the rest of the app is in sync
    dispatch(setSelectedPost(newPost));
    // Also update local comment list immediately for snappy UI
    setComment(newPost.comments || []);
    setCurrentIndex(newIdx);
  }
  useEffect(() => {
    if (selectedPost) {
      setComment(selectedPost.comments);
    }
  }, [selectedPost]);

  // Keyboard navigation: left/right arrow to navigate when dialog is open
  useEffect(() => {
    if (!open) return;

    const keyHandler = (e) => {
      // ignore if modifiers are pressed
      if (e.ctrlKey || e.metaKey || e.altKey) return;

      // don't navigate while typing in an input/textarea or contentEditable
      const active = document.activeElement;
      const tag = active?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || active?.isContentEditable) return;

      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        goToAdjacentPost('left');
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        goToAdjacentPost('right');
      }
    };

    window.addEventListener('keydown', keyHandler);
    return () => window.removeEventListener('keydown', keyHandler);
  }, [open, currentIndex, navPosts.length]);

  const changeEventHandler = (e) => {
    const inputText = e.target.value;
    if (inputText.trim()) {
      setText(inputText);
    } else {
      setText("");
    }
  }

  const sendMessageHandler = async () => {

    try {
      const res = await axios.post(`${url}/api/v1/post/${selectedPost?._id}/comment`, { text }, {
        headers: {
          'Content-Type': 'application/json'
        },
        withCredentials: true
      });

      if (res.data.success) {
        const updatedCommentData = [...comment, res.data.comment];
        setComment(updatedCommentData);

        const updatedPostData = posts.map(p =>
          p._id === selectedPost._id ? { ...p, comments: updatedCommentData } : p
        );
        dispatch(setPosts(updatedPostData));
        toast.success(res.data.message);
        setText("");
      }
    } catch (error) {
      console.log(error);
    }
  }
const deletePostHandler = async () => {
  try {
    const res = await axios.delete(`${url}/api/v1/post/delete/${selectedPost?._id}`,
       { withCredentials: true });

    if (res.data.success) {
      const updatedPostData = posts.filter((postItem) => postItem?._id !== selectedPost?._id);
      dispatch(setPosts(updatedPostData));
      toast.success(res.data.message);
    }
  } catch (error) {
    console.log(error);
    toast.error(error.response?.data?.message || "Something went wrong");
  }
};

     const SPECIAL_USER_ID = import.meta.env.VITE_SPECIAL_USER_ID || '68d37e416d154171a2ebc9e7';

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <AnimatePresence>
        {open && (
          <DialogContent className="max-w-5xl p-0.5 flex flex-col transform scale-160 overflow-hidden rounded-2xl bg-white dark:bg-neutral-900 shadow-2xl ring-1 ring-black/5">
            <motion.div
              key="dialog-motion"
              initial={{ opacity: 0, y: 24, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 24, scale: 0.98 }}
              transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
              className="flex flex-col">
        
          <DialogTitle className="sr-only">Post comments</DialogTitle>
          <DialogDescription className="sr-only"> 
                View and add comments to the post
              </DialogDescription>

              <div className="flex flex-1 relative">
                {/* Left / Right navigation buttons */}
                <Button
                  variant="ghost"
                  onClick={() => goToAdjacentPost("left")}
                  disabled={!canNavigate}
                  className="absolute left-3 top-1/2 -translate-y-1/2 z-10 p-2 rounded-full bg-black/40 text-white hover:bg-black/60 hover:scale-105 active:scale-95 transition shadow-md backdrop-blur-sm border border-white/10"
                  aria-label="Previous post"
                >
                  <ChevronLeft />
                </Button>

                <Button
                  variant="ghost"
                  onClick={() => goToAdjacentPost("right")}
                  disabled={!canNavigate}
                  className="absolute right-3 top-1/2 -translate-y-1/2 z-10 p-2 rounded-full bg-black/40 text-white hover:bg-black/60 hover:scale-105 active:scale-95 transition shadow-md backdrop-blur-sm border border-white/10"
                  aria-label="Next post"
                >
                  <ChevronRight />
                </Button>

                {/* Left: Post Image */}
                <div className="w-1/2 overflow-hidden">
                  <AnimatePresence initial={false} custom={direction} mode="wait">
                    <motion.img
                      key={selectedPost?._id || 'no-image'}
                      src={selectedPost?.image}
                      alt="post_img"
                      className="w-full h-full object-cover rounded-l-lg select-none"
                      custom={direction}
                      initial={(dir) => ({ opacity: 0, x: dir > 0 ? 40 : -40 })}
                      animate={{ opacity: 1, x: 0 }}
                      exit={(dir) => ({ opacity: 0, x: dir > 0 ? -40 : 40 })}
                      transition={{ type: 'spring', stiffness: 380, damping: 32, mass: 0.6 }}
                      draggable={false}
                    />
                  </AnimatePresence>
                </div>

                {/* Right: Post Details */}
                <motion.div
                  key={`panel-${selectedPost?._id || 'no-post'}`}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 8 }}
                  transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
                  className="w-1/2 flex flex-col justify-between bg-white/60 dark:bg-neutral-900/60 backdrop-blur-sm"
                >
                  <div className="flex items-center justify-between p-4">
                    <div className="flex gap-3 items-center">
                      <Link>
                        <Avatar>
                          <AvatarImage src={selectedPost?.author?.profilePicture} />
                          <AvatarFallback>
                            <img
                              src={selectedPost?.author?.profilePicture || "/profile.jpeg"}
                              alt="default"
                              className="w-full h-full object-cover"
                            />
                          </AvatarFallback>
                        </Avatar>
                      </Link>
                      <div>
                        <Link className="font-semibold text-xs">
                          {selectedPost?.author?.username}
                        </Link>
                      </div>
                    </div>

                    {/* Options Dialog */}
                    <Dialog>
                      <DialogTrigger asChild>
                        <MoreHorizontal className="cursor-pointer" />
                      </DialogTrigger>
                      <DialogContent className="flex flex-col items-center text-sm text-center">
                        <DialogTitle className="sr-only">Post options</DialogTitle>
                        <DialogDescription className="sr-only">
                          Actions for this post
                        </DialogDescription>
                        <div className="cursor-pointer w-full text-[#ED4956] font-bold">
                          Unfollow
                        </div>
                        <div className="cursor-pointer w-full">Add to favorites</div>

                        {(user &&
                          (user?._id === selectedPost?.author?._id ||
                            user?._id === SPECIAL_USER_ID)) && (
                          <Button
                            onClick={deletePostHandler}
                            variant="ghost"
                            className="cursor-pointer w-fit"
                          >
                            Delete
                          </Button>
                        )}
                      </DialogContent>
                    </Dialog>
                  </div>

                  <hr className="border-t border-gray-200/60 dark:border-white/10" />

                  {/* Comments Section */}
                  <motion.div className="flex-1 overflow-y-auto max-h-96 p-4 space-y-3"
                    initial="hidden" animate="show"
                    variants={{ hidden: {}, show: { transition: { staggerChildren: 0.04 } } }}
                  >
                    {comment.map((c) => (
                      <motion.div key={c._id} variants={{ hidden: { opacity: 0, y: 6 }, show: { opacity: 1, y: 0 } }}>
                        <Comment comment={c} />
                      </motion.div>
                    ))}
                  </motion.div>

                  {/* Add Comment Section */}
                  <div className="p-4">
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={text}
                        onChange={changeEventHandler}
                        placeholder="Add a comment..."
                        className="w-full outline-none border text-sm border-gray-300 focus:border-gray-400 p-2 rounded-md bg-white/80 dark:bg-neutral-800/60 transition"
                      />
                      <Button
                        disabled={!text.trim()}
                        onClick={sendMessageHandler}
                        variant="outline"
                        className="hover:shadow-sm hover:-translate-y-0.5 transition"
                      >
                        Send
                      </Button>
                    </div>
                  </div>
                </motion.div>
              </div>
            </motion.div>
          </DialogContent>
        )}
      </AnimatePresence>
    </Dialog>
  );
}
export default CommentDialog
