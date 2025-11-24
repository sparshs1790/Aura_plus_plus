    import React, { useRef } from 'react'
    import { useDispatch, useSelector } from 'react-redux'
    import { Link } from 'react-router-dom';
    import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
    import axios from 'axios';
    import { toast } from 'sonner';
    import { setAuthUser, setSuggestedUsers } from '@/redux/authSlice';
    import { ChevronLeft, ChevronRight } from 'lucide-react';

const SuggestedBox = () => {
    const dispatch = useDispatch();
    const { suggestedUsers = [], user: authUser } = useSelector(store => store.auth);
    const scrollRef = useRef();
    const url = import.meta.env.VITE_URL || 'http://localhost:5000';

    const handleFollow = async (targetUserId) => {
        try {
            const res = await axios.post(`${url}/api/v1/user/followorunfollow/${targetUserId}`, {}, { withCredentials: true });
            if (res.data.success) {
                const isNowFollowing = res.data.type === 'followed';

                const updatedAuthUser = {
                    ...authUser,
                    following: isNowFollowing
                        ? [...(authUser?.following || []), targetUserId]
                        : (authUser?.following || []).filter(id => String(id) !== String(targetUserId))
                };
                dispatch(setAuthUser(updatedAuthUser));

                // Optimistically remove followed user from suggestions
                if (isNowFollowing) {
                    const remaining = suggestedUsers.filter(u => u._id !== targetUserId);
                    dispatch(setSuggestedUsers(remaining));
                }
                toast.success(res.data.message);
            }
        } catch (error) {
            console.log(error);
            toast.error(error?.response?.data?.message || 'Failed to update follow state');
        }
    }

    // Scroll handlers
    const scrollLeft = () => {
        if (scrollRef.current) {
            scrollRef.current.scrollBy({ left: -300, behavior: 'smooth' });
        }
    };
    const scrollRight = () => {
        if (scrollRef.current) {
            scrollRef.current.scrollBy({ left: 300, behavior: 'smooth' });
        }
    };

    return (
        <div className="my-10">
            <div className="flex items-center justify-between text-sm mb-4">
                <h1 className="font-semibold text-gray-600">Suggested for you</h1>
                <span className="font-medium cursor-pointer">See All</span>
            </div>
            <div className="relative">
                {/* Left Button */}
                <button
                    onClick={scrollLeft}
                    className="absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-white border rounded-full shadow p-1 hover:bg-gray-100 transition"
                    style={{ display: suggestedUsers.length > 3 ? 'block' : 'none' }}
                    aria-label="Scroll left"
                >
                    <ChevronLeft size={24} />
                </button>
                {/* Scrollable User Cards */}
                <div
                    ref={scrollRef}
                    className="flex gap-4 overflow-x-auto scrollbar-hide px-8"
                    style={{ scrollBehavior: 'smooth' }}
                >
                    {suggestedUsers.map((suggested) => (
                        <div
                            key={suggested._id}
                            className="flex flex-col items-center bg-white border border-gray-200 rounded-xl shadow-md min-w-[180px] max-w-[180px] p-4 mx-2 transition hover:shadow-lg"
                        >
                            <Link to={`/profile/${suggested?._id}`}>
                                <Avatar className="h-16 w-16 mb-2">
                                    <AvatarImage src={suggested?.profilePicture} alt="profile" />
                                    <AvatarFallback>
                                        <img src={suggested?.profilePicture ||  '/profile.jpeg'} alt="default" className="w-full h-full object-cover" />
                                    </AvatarFallback>
                                </Avatar>
                            </Link>
                            <h1 className="font-semibold text-sm truncate w-full text-center">
                                <Link to={`/profile/${suggested?._id}`}>{suggested?.username}</Link>
                            </h1>
                            <span className="text-gray-500 text-xs mb-2 text-center truncate w-full">{suggested?.bio || 'Bio here...'}</span>
                            <button
                                onClick={() => handleFollow(suggested?._id)}
                                className="mt-2 w-full bg-[#3BADF8] hover:bg-[#3495d6] text-white text-xs font-bold py-1 rounded transition"
                            >
                                Follow
                            </button>
                        </div>
                    ))}
                </div>
                {/* Right Button */}
                <button
                    onClick={scrollRight}
                    className="absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-white border rounded-full shadow p-1 hover:bg-gray-100 transition"
                    style={{ display: suggestedUsers.length > 3 ? 'block' : 'none' }}
                    aria-label="Scroll right"
                >
                    <ChevronRight size={24} />
                </button>
            </div>
        </div>
    );
};

export default SuggestedBox;
