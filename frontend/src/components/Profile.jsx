import React, { useState } from 'react'
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar'
import useGetUserProfile from '@/hooks/useGetUserProfile';
import { Link, useParams } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { AtSign, Heart, MessageCircle, Lock } from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';
import { setAuthUser, setUserProfile } from '@/redux/authSlice';
import { setSelectedPost } from '@/redux/postSlice';
import CommentDialog from './CommentDialog';
import FollowListDialog from './FollowListDialog';
import SuggestedBox from './SuggestedBox';

const Profile = () => {
  const params = useParams();
  const userId = params.id;
  useGetUserProfile(userId);
  const [activeTab, setActiveTab] = useState('posts');
     const url = import.meta.env.VITE_URL || 'http://localhost:5000';
     const SPECIAL_USER_ID = import.meta.env.VITE_SPECIAL_USER_ID || '68d37e416d154171a2ebc9e7';


  const { userProfile, user } = useSelector(store => store.auth);
  const dispatch = useDispatch();

  const [commentDialogOpen, setCommentDialogOpen] = useState(false);
  const [followersOpen, setFollowersOpen] = useState(false);
  const [followingOpen, setFollowingOpen] = useState(false);
  // const [selectedPost, setSelectedPost] = useState(null);

  // Guard: wait for userProfile to load
  if (!userProfile) {
    return <div>Loading...</div>;
  }

  const isLoggedInUserProfile = user?._id === userProfile?._id;
  const isFollowing = !!user?.following?.some(id => String(id) === String(userProfile?._id));
  const isPrivateBlocked = !!userProfile?.isPrivate && !isLoggedInUserProfile && !isFollowing;

  const handleFollowToggle = async () => {
    try {
      const res = await axios.post(`${url}/api/v1/user/followorunfollow/${userProfile?._id}`, {}, { withCredentials: true });
      if (res.data.success) {
        const isNowFollowing = res.data.type === 'followed';

        const updatedAuthUser = {
          ...user,
          following: isNowFollowing
            ? [...(user?.following || []), userProfile._id]
            : (user?.following || []).filter(id => String(id) !== String(userProfile._id))
        };
        dispatch(setAuthUser(updatedAuthUser));

        const updatedProfile = {
          ...userProfile,
          followers: isNowFollowing
            ? [...(userProfile?.followers || []), updatedAuthUser._id]
            : (userProfile?.followers || []).filter(id => String(id) !== String(updatedAuthUser._id))
        };
        dispatch(setUserProfile(updatedProfile));

        toast.success(res.data.message);
      }
    } catch (error) {
      console.log(error);
      toast.error(error?.response?.data?.message || 'Failed to update follow state');
    }
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);
  }

  const displayedPost = activeTab === 'posts' ? (userProfile?.posts || []) : (userProfile?.bookmarks || []);

  const handlePostClick = (post) => {
    dispatch(setSelectedPost(post));
    // setSelectedPost(post);
    setCommentDialogOpen(true);
  };
  // const url = process.env.URL || 'http://localhost:5000';

  // Remove user handler
  const handleRemoveUser = async () => {
    console.log("Remove button clicked!");
    console.log("Removing user:", userProfile?._id);
    console.log("Current user:", user?._id);
    
    try {
      const res = await axios.delete(
        `${url}/api/v1/user/remove/${userProfile?._id}`,
        { withCredentials: true }
      );
      console.log("API Response:", res.data);
      if (res.data.success) {
        toast.success(res.data.message);
        // Redirect to home page after successful removal
        window.location.href = '/';
      } else {
        toast.error(res.data.message || "Failed to remove user");
      }
    } catch (error) {
      console.error("Remove user error:", error);
      toast.error(error?.response?.data?.message || "Failed to remove user");
    }
  };


  return (
    <div className='flex max-w-4xl justify-center mx-auto'>
      <div className='flex flex-col gap-16 p-6 w-full'>
        <div className='grid grid-cols-1 md:grid-cols-2 gap-8'>
          <section className='flex items-center justify-center'>
            <Avatar className='h-32 w-32'>
              <AvatarImage src={userProfile?.profilePicture} alt="profilephoto" />
              <AvatarFallback>
              <Link to ="/account/edit"> <img src={userProfile?.profilePicture || '/profile.jpeg'} alt="default" className="w-full h-full object-cover" /></Link>
              </AvatarFallback>
            </Avatar>
          </section>
          <section>
            <div className='flex flex-col gap-5'>
              <div className='flex items-center gap-2 flex-wrap'>
                <span className='text-lg font-semibold'>{userProfile?.username}</span>
                {
                  isLoggedInUserProfile ? (
                    <>
                      <Link to="/account/edit"><Button variant='secondary' className='hover:bg-gray-200 h-8'>Edit profile</Button></Link>
                      <Button variant='secondary' className='hover:bg-gray-200 h-8'>View archive</Button>
                      <Button variant='secondary' className='hover:bg-gray-200 h-8'>Ad tools</Button>
                    </>
                  ) : (
                    <>
                      {isFollowing ? (
                        <>
                          <Button onClick={handleFollowToggle} variant='secondary' className='h-8'>Unfollow</Button>
                          <Button variant='secondary' className='h-8'>Message</Button>
                        </>
                      ) : (
                        <Button onClick={handleFollowToggle} className='bg-[#0095F6] hover:bg-[#3192d2] h-8'>Follow</Button>
                      )}
                      {/* Show Remove button only for the special admin user */}
                      {String(user?._id) === SPECIAL_USER_ID && !isLoggedInUserProfile && (
                        <Button
                          variant='destructive'
                          className='h-8'
                          onClick={handleRemoveUser}
                        >
                          Remove
                        </Button>
                      )}
                    </>
                  )
                }
              </div>
              <div className='flex items-center gap-4'>
                <p><span className='font-semibold '>{userProfile?.posts?.length || 0} </span>posts</p>
                <button onClick={() => setFollowersOpen(true)} className='text-color-hover'>
                  <span className='font-semibold cursor-pointer'>{userProfile?.followers?.length || 0} </span>followers
                </button>
                <button onClick={() => setFollowingOpen(true)} >
                  <span className='font-semibold cursor-pointer'>{userProfile?.following?.length || 0} </span>following
                </button>
              </div>
              <div className='flex flex-col gap-1'>
                <span className='font-semibold'>{userProfile?.bio || 'bio here...'}</span>
                <Badge className='w-fit' variant='secondary'><AtSign /> <span className='pl-1'>{userProfile?.username}</span> </Badge>
                <span>Website Made by Sparsh sharma</span>
                <span>Do share your valuable feedback</span>
                <span>you can also message sparsh sharma</span>
              </div>
            </div>
          </section>
        </div>
        <div className='border-t border-t-gray-200'>
          <div className='flex items-center justify-center gap-10 text-sm'>
            <span className={`py-3 cursor-pointer ${activeTab === 'posts' ? 'font-bold' : ''}`} onClick={() => handleTabChange('posts')}>
              POSTS
            </span>
            <span className={`py-3 cursor-pointer ${activeTab === 'saved' ? 'font-bold' : ''}`} onClick={() => handleTabChange('saved')}>
              SAVED
            </span>
            <span className='py-3 cursor-pointer'>REELS</span>
            <span className='py-3 cursor-pointer'>TAGS</span>
          </div>
          {
            isPrivateBlocked ? (
              <div className='flex flex-col items-center justify-center text-center py-16 gap-3'>
                <div className='h-20 w-20 rounded-full border border-gray-300 flex items-center justify-center'>
                  <Lock className='text-gray-500' />
                </div>
                <p className='font-semibold'>This account is private</p>
                <p className='text-sm text-gray-500'>Follow to see their photos and videos.</p>
              </div>
            ) : (
              <div className='grid grid-cols-3 gap-2 mt-4'>
                {
                  displayedPost?.map((post) => {
                    const keyValue = post?._id || (typeof post === 'string' ? post : JSON.stringify(post));
                    return (
                      <div
                        key={keyValue}
                        className='relative group cursor-pointer'
                        onClick={() => handlePostClick(post)}
                      >
                        <img src={post.image} alt='postimage' className='rounded-md my-2 w-full aspect-square object-cover border border-gray-200' />
                        <div className='absolute inset-0 flex items-center justify-center bg-black bg-opacity-40 opacity-0 group-hover:opacity-90 transition-opacity duration-300'>
                          <div className='flex items-center text-white space-x-4'>
                            <button className='flex items-center gap-2 hover:text-gray-300'>
                              <Heart />
                              <span>{post?.likes?.length || 0}</span>
                            </button>
                            <button className='flex items-center gap-2 hover:text-gray-300'>
                              <MessageCircle />
                              <span>{post?.comments?.length || 0}</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    )
                  })
                }
              </div>
            )
          }
        </div>
        <SuggestedBox />
      </div>
      <CommentDialog
        open={commentDialogOpen}
        setOpen={setCommentDialogOpen}
        // selectedPost={selectedPost}
      />
      <FollowListDialog open={followersOpen} setOpen={setFollowersOpen} userId={userProfile?._id} type='followers' />
      <FollowListDialog open={followingOpen} setOpen={setFollowingOpen} userId={userProfile?._id} type='following' />
    </div>
  )
}

export default Profile
