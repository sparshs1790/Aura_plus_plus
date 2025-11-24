import React, { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { toast } from 'sonner';

const NotificationToast = () => {
    const { socket } = useSelector(store => store.socketio);
    const [notifications, setNotifications] = useState([]);

    useEffect(() => {
        if (socket) {
            const handleNotification = (notification) => {
                setNotifications(prev => [...prev, notification]);
                
                // Show toast notification
                toast(notification.message, {
                    description: `From ${notification.userDetails?.username}`,
                    action: {
                        label: "View",
                        onClick: () => console.log("View notification")
                    }
                });
            };

            socket.on('notification', handleNotification);

            return () => {
                socket.off('notification', handleNotification);
            };
        }
    }, [socket]);

    return null; // This component doesn't render anything visible
};

export default NotificationToast;
