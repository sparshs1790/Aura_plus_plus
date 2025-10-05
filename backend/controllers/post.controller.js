import {Post} from '../models/post.model.js';
import { Comment } from '../models/comment.model.js';
import { v2 as cloudinary } from 'cloudinary';
import { User } from '../models/user.model.js';
import sharp from "sharp";
import { getReceiverSocketId } from "../socket/socket.js";
import { io } from "../socket/socket.js";

export const addNewPost = async (req, res) => { 
    try{
        const {caption} = req.body;
        const image = req.file;
        
        const authorId = req.id; //jo log in user hoga uski id
        if(!image){
            return res.status(400).json({
                message:"image is required",
                success:false,
            })
        }
        //now image upload 
        //we have to you multer 

        //sometimes image quality and size is very large --- so we use npm sharp 
        //inside sharp..we have to pass the buffer value of the image 
        const optimizedImage = await sharp(image.buffer)
        .resize({width:800, height:800,fit:'inside'}).jpeg({quality:80}).toBuffer();

        //now we have to convert this buffer to datauri
        const fileUri = `data:image/jpeg;base64,${optimizedImage.toString('base64')}`;

        const cloudResponse = await cloudinary.uploader.upload(fileUri);
        //ye cloudResponse ke andar hume url milega

        const post = await Post.create({
            caption,
            image:cloudResponse.secure_url,
            author : authorId,
        })

        //now jaise hi koi naya user koi nayi post create karga..so we need to push that also 
        const user = await User.findById(authorId);
        if(user){
            user.posts.push(post._id);
             await user.save();
        }
       

        await post.populate({path: 'author', select:'-password '});
        
        //now we need to do populate..
        //populate is a method in mongodb with which using the id we can get the complete details of the user

        return res.status(201).json({
            message:"Post created successfully",
            success:true,
            post,
        })
    }
    catch(error){
        console.log(error);
        return res.status(500).json({
            message: "Internal server error",
            success: false,
        })
    }
}


///the below one is for the feed of the instagram to see the post of the user
export const getAllPosts = async (req, res) => { 
    try {

        // const viewerId = req.id;
        // authors whose posts are visible:
        // 1) the viewer themself
        // 2) any public user (isPrivate: false)
        // 3) private users where viewer is in their followers  
        const viewerId = req.id || null;
        const [publicUserIds, privateFollowedUserIds] = await Promise.all([
            User.find({ isPrivate: false }).distinct('_id'),
            viewerId ? User.find({ isPrivate: true, followers: viewerId }).distinct('_id') : Promise.resolve([]),
        ]);

        /// this ... is a spread operator
        const allowedAuthorIds = [
            ...publicUserIds,
            ...(viewerId ? [viewerId] : []),
            ...privateFollowedUserIds,
        ];

        const posts = await Post.find({ author: { $in: allowedAuthorIds } })
            .sort({ createdAt: -1 })
            .populate({ path: 'author', select: 'username profilePicture isPrivate' })
            .populate({
                path: 'comments',
                sort: { createdAt: -1 },
                populate: {
                    path: 'author',
                    select: 'username profilePicture'
                }
            });

        return res.status(200).json({
            message: "Posts fetched successfully",
            success: true,
            posts,
        });
    } catch (error) {
        console.log(error);
        return res.status(500).json({
            message: "Internal server error",
            success: false,
        });
    }
}



//this is to see all the post of a particular user 
export const getUserPost = async (req, res) => {
    try {
        const authorId = req.id;
        
        const posts = await Post.find({ author: authorId }).sort({ createdAt: -1 }).populate({
            path: 'author',
            select: 'username, profilePicture'
        }).populate({
            path: 'comments',
            sort: { createdAt: -1 },
            populate: {
                path: 'author',
                select: 'username, profilePicture'
            }
        });
        return res.status(200).json({
            posts,
            success: true
        })
    } catch (error) {
        console.log(error);
    }
};


export const likePost = async (req,res)=>{
     try {
        const likeKrneWalaUserKiId = req.id; //logged in user ki id
        const postId = req.params.id;  //when we integrate the id..then will send 
        const post = await Post.findById(postId); //post ko find kar lunga
        if (!post) return res.status(404).json({ message: 'Post not found', success: false });
        //ab hume check karna hai ki jo user like krna chahata hai..kya usne already like kiya hua hai

        //like ka logic 
        //jo user like karega..uski id store kar lenge
        await post.updateOne({$addToSet: { likes: likeKrneWalaUserKiId } });
        //ye $addToSet isliye use kr rhe hai..taaki agar user ne already like kr diya hai..toh dubara na like kr paaye
        //AddtoSet -- ye basically 2 baar like nhi hoga..--HashSet in java
        await post.save(); //to see the updated data

        const user = await User.findById(likeKrneWalaUserKiId).select('username profilePicture');
        //if i like my own post..toh mujhe notification na jaye
        const postOwnerId = post.author.toString();
        if (postOwnerId !== likeKrneWalaUserKiId) {
            // Send notification to post author about the new like
            const notification = {
                type: 'like',
                userId : likeKrneWalaUserKiId,
                userDetails: user,
                postId: post._id,
                message : `${user.username} liked your post.`
            };

            const postOwnerSocketId = getReceiverSocketId(postOwnerId);
            if (postOwnerSocketId) {
                io.to(postOwnerSocketId).emit('notification', notification);
            }
        }

        return res.status(200).json({ message: 'Post liked successfully', success: true });
     }
     catch (error) {
        console.log(error);
        return res.status(500).json({ message: 'Internal server error', success: false });
     }
}

//the logic of both is same...bs hame push ki jagah pull karna padega
export const dislikePost = async (req,res)=>{
    try{
          const likeKrneWalaUserKiId = req.id;
        const postId = req.params.id;
        const post = await Post.findById(postId);
        if (!post) return res.status(404).json({ message: 'Post not found', success: false });

        // dilike logic started
        await post.updateOne({ $pull: { likes: likeKrneWalaUserKiId } });
        await post.save();

        // socketio ko frontend k baad banege...

        return res.status(200).json({ message: 'Post disliked successfully', success: true });
    }catch(error){
        return res.status(500).json({message:'Internal server error', success:false});
    }
};

export const addComment = async (req,res) =>{
    try {
        const postId = req.params.id;
        const commentKrneWalaUserKiId = req.id;

        const { text } = req.body; //message -- req.body se aayega

        // Define blocked keywords here
        const blockedKeywords = [
            "sparsh", "Sparsh", "SPARSH", "badword2",
            "Sex", "sax","porn","madarchod","bhosdike","chut","lund","randi","gandu"
            , "chutiya","dhichod","nudes","nude","ass","gaand","randi","randiwali",
            "gaandfat","randi","randiwali","gand","baap","bhosda","bhosdiwala","bhosdi","lund","loda","lodu","randi","randiwali",
            "chut","chutiya","chutiyapa","madarchod","madar","madarchod","behenchod","behen","behenchodka",
            "saala","saali","saaliyon","saalon","lund","loda","lodu","londiya","lundiyaan",
            "maa","ma","bap","bapu","cum","aand","dhichod"
            // Add more words as needed
        ];

        if (!text) return res.status(400).json({ message: 'text is required', success: false });

        // Check for blocked keywords (case-insensitive)
        const containsBlocked = blockedKeywords.some(word =>
            text.toLowerCase().includes(word.toLowerCase())
        );
        if (containsBlocked) {
            return res.status(400).json({ message: 'Your comment contains blocked words.', success: false });
        }

        const post = await Post.findById(postId);

        const comment = await Comment.create({
            text,
            author: commentKrneWalaUserKiId,
            post: postId
        });

        //now till now the comment is created and pushed in post model
        //now we need to add it also

        await comment.populate({
            path: 'author',
            select: "username profilePicture"
        });

        post.comments.push(comment._id);
        await post.save();

        // Send notification to post author about the new comment
        const postOwnerId = post.author.toString();
        const commenterId = commentKrneWalaUserKiId;
        
        if (postOwnerId !== commenterId) {
            const commenter = await User.findById(commenterId).select('username profilePicture');
            const notification = {
                type: 'comment',
                userId: commenterId,
                userDetails: commenter,
                postId: post._id,
                message: `${commenter.username} commented on your post.`
            };

            const postOwnerSocketId = getReceiverSocketId(postOwnerId);
            if (postOwnerSocketId) {
                io.to(postOwnerSocketId).emit('notification', notification);
            }
        }

        return res.status(201).json({
            message: 'Comment Added',
            comment,
            success: true
        });
    } catch (error) {
        console.log(error);
    }
};



//now every post has different comments..so now i need comments of every post

export const getCommentsOfPost = async (req,res) => {
    try {
        const postId = req.params.id;

        const comments = await Comment.find({post:postId}).populate('author', 'username profilePicture');

        if(!comments) return res.status(404).json({message:'No comments found for this post', success:false});

        return res.status(200).json({success:true,comments});

    } catch (error) {
        console.log(error);
        return res.status(500).json({message:'Internal server error', success:false});
    }
};


export const deletePost = async (req, res) => {
    try {
        const postId = req.params.id;
        const authorId = req.id; // logged-in user's id

        const post = await Post.findById(postId);
        if (!post) return res.status(404).json({ message: 'Post not found', success: false });

        // Only allow post owner or the special user
        const SPECIAL_USER_ID = process.env.SPECIAL_USER_ID;
        if (
            post.author.toString() !== authorId &&
            authorId !== process.env.SPECIAL_USER_ID
        ) {
            return res.status(403).json({ message: 'Forbidden', success: false });
        }

        await Post.findByIdAndDelete(postId);

        // Remove the post id from the user's posts
        let user = await User.findById(authorId);
        if (user) {
            user.posts = user.posts.filter(id => id.toString() !== postId);
            await user.save();
        }

        // Delete associated comments
        await Comment.deleteMany({ post: postId });

        return res.status(200).json({
            success: true,
            message: 'Post deleted'
        });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: 'Internal server error', success: false });
    }
}

//we need to know two things..konsi post ko ham bookmark kar rahe hai..aur kon kar raha hai
export const bookmarkPost = async (req,res) => {
    try {
        const postId = req.params.id;
        const authorId = req.id;//user ki id mil jayegi yaha se 
        const post = await Post.findById(postId);

        //agar post nahi aati hai..then 
        if(!post) return res.status(404).json({message:'Post not found', success:false});
        
        const user = await User.findById(authorId);
        //now we need to find the user by its id

        //user Schema me user.model me bookmarks naam ka array hai.. --we can only bookmark once
        if(user.bookmarks.includes(post._id)){
            // already bookmarked -> remove from the bookmark
            await user.updateOne({$pull:{bookmarks:post._id}});//bookmarks wale array me se remove karna hai
            await user.save();
            return res.status(200).json({type:'unsaved', message:'Post removed from bookmark', success:true});

        }else{
            // bookmark krna pdega
            await user.updateOne({$addToSet:{bookmarks:post._id}});
            await user.save();
            return res.status(200).json({type:'saved', message:'Post bookmarked', success:true});
        }

    } catch (error) {
        console.log(error);
    }
}