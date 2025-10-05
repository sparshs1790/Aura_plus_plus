import {Conversation} from "../models/conversation.model.js";
import {Message} from "../models/message.model.js"
import { User } from "../models/user.model.js";
import { getReceiverSocketId } from "../socket/socket.js";
import { io } from "../socket/socket.js";

// for chatting
export const sendMessage = async (req,res) => {
    try {
        const senderId = req.id;
        const receiverId = req.params.id;
        const {textMessage:message} = req.body;
      
        let conversation = await Conversation.findOne({
            participants:{$all:[senderId, receiverId]}
        });

        if(!conversation){
            conversation = await Conversation.create({
                participants:[senderId, receiverId]
            })
        };


        const newMessage = await Message.create({
            senderId,
            receiverId,
            message
        });
        if(newMessage) conversation.messages.push(newMessage._id);

        await Promise.all([conversation.save(),newMessage.save()])

       
        const receiverSocketId = getReceiverSocketId(receiverId);
        if (receiverSocketId) {
           
            io.to(receiverSocketId).emit('newMessage', newMessage);

            try {
                const sender = await User.findById(senderId)
                .select('username profilePicture');
                 
                const messageNotification = {
                    type: 'message',
                    userId: senderId,
                    userDetails: sender,
                    text: message,
                    conversationId: conversation._id,
                };
                io.to(receiverSocketId).emit('messageNotification', messageNotification);
            } catch (e) {
            }
        }
        return res.status(201).json({
            success:true, newMessage})
            
    } catch (error) {
        console.log(error);
        return res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
}
export const getMessage = async (req,res) => {
    try {
        const senderId = req.id;
        const receiverId = req.params.id;
        const conversation = await Conversation.findOne({
            participants:{$all: [senderId, receiverId]}
        }).populate('messages');
        if(!conversation) return res.status(200).json({success:true, messages:[]});

        return res.status(200).json({success:true, messages:conversation?.messages});
        
    } catch (error) {
        console.log(error);
    }
}