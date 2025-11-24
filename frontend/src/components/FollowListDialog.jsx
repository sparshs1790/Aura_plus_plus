import React, { useEffect, useMemo, useState } from 'react'
import axios from 'axios'
import { useSelector, useDispatch } from 'react-redux'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from './ui/dialog'
import FollowBox from './followbox'
import { setAuthUser, setUserProfile } from '@/redux/authSlice'
import { toast } from 'sonner'

const FollowListDialog = ({ open, setOpen, userId, type = 'followers' }) => {
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState([]);
  const dispatch = useDispatch();
  const { user, userProfile } = useSelector(store => store.auth);
     const url = import.meta.env.VITE_URL || 'http://localhost:5000';

  const title = type === 'following' ? 'Following' : 'Followers';

  const followingSet = useMemo(() => new Set(user?.following?.map(id => String(id)) || []), [user]);

  useEffect(() => {
    if (!open || !userId) return;
    const fetchList = async () => {
      try {
        setLoading(true);
        const apiUrl = type === 'following'
          ? `${url}/api/v1/user/${userId}/following`
          : `${url}/api/v1/user/${userId}/followers`;
        const res = await axios.get(apiUrl, { withCredentials: true });
        const list = type === 'following' ? (res.data.following || []) : (res.data.followers || []);
        setUsers(list);
      } catch (err) {
        setUsers([]);
      } finally {
        setLoading(false);
      }
    };
    fetchList();
  }, [open, userId, type]);

  const handleFollowToggle = async (targetUserId) => {
    try {
      const res = await axios.post(`${url}/api/v1/user/followorunfollow/${targetUserId}`, {}, { withCredentials: true });
      if (res.data.success) {
        const isNowFollowing = res.data.type === 'followed';

        const updatedAuthUser = {
          ...user,
          following: isNowFollowing
            ? [...(user?.following || []), targetUserId]
            : (user?.following || []).filter(id => String(id) !== String(targetUserId))
        };
        dispatch(setAuthUser(updatedAuthUser));

        if (userProfile && String(userProfile._id) === String(targetUserId)) {
          const updatedProfile = {
            ...userProfile,
            followers: isNowFollowing
              ? [...(userProfile?.followers || []), updatedAuthUser._id]
              : (userProfile?.followers || []).filter(id => String(id) !== String(updatedAuthUser._id))
          };
          dispatch(setUserProfile(updatedProfile));
        }

        toast.success(res.data.message);
      }
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Failed to update follow state');
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-md p-0 overflow-hidden">
        <DialogTitle className="p-4 text-center border-b font-semibold">{title}</DialogTitle>
        <DialogDescription className="sr-only">List of {title.toLowerCase()}</DialogDescription>
        <div className="max-h-80 overflow-y-auto">
          {loading ? (
            <div className="p-4 text-center text-sm text-gray-500">Loading...</div>
          ) : users.length === 0 ? (
            <div className="p-6 text-center text-sm text-gray-500">No {title.toLowerCase()} yet</div>
          ) : (
            users.map(u => (
              <FollowBox
                key={u._id}
                user={u}
                isFollowing={followingSet.has(String(u._id))}
                onFollowToggle={handleFollowToggle}
                showFollowButton={String(u._id) !== String(user?._id)}
              />
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default FollowListDialog


