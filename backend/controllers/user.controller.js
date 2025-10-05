import { User } from "../models/user.model.js";
import { Post } from "../models/post.model.js";
import { Comment } from "../models/comment.model.js";
import { Conversation } from "../models/conversation.model.js";
import { Message } from "../models/message.model.js";
import mongoose from "mongoose";


import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import cloudinary from "../utils/cloudinary.js";
import getDataUri from "../utils/datauri.js";
import { getReceiverSocketId } from "../socket/socket.js";
import { io } from "../socket/socket.js";
dotenv.config();
//this will allow us to use the environment variables from the .env file

export const register = async (req, res) => {
    try {
        //register karne ke liye username , email and password
        const {username, email, password} = req.body;
        //req.body.. jb bhi ham form sumbit krte hai..
        //to us data ko ham req.body se retrieve kar sakte hai
       
        //this below if statement to check that the user has properly entered details or not
        if(!username || !email || !password){
            //this means error
            return res.status(401).json({
                message:"Something is missing",
                success:false,
            })
        }
        if(username.toLowerCase().includes("sparsh")||
        username.toLowerCase().includes("spaarsh")||
        username.toLowerCase().includes("sparrsh")||
        username.toLowerCase().includes("spparsh")||
        username.toLowerCase().includes("sparssh")||
        email.toLowerCase().includes("sparsh") || email.toLowerCase().includes("spaarsh")||
        email.toLowerCase().includes("spparsh") || email.toLowerCase().includes("sparrsh") ||
        email.toLowerCase().includes("sparssh") || email.toLowerCase().includes("spaaarsh")
    
    ){
                    return res.status(401).json({
                        message: "Nikal Bhosdike",
                        success:false,
                    })
            }

        

        //now we will check if the user has already registered or not
        const user = await User.findOne({email});
        //this findOne method will check that the user exist in database or not

        if(user){
            return res.status(401).json({
                message:"The email already exist... Try with Different Email",
                success: false, //kaam abhi bhi pura nahi hua
            })
        }
        //now this means that we have not finded the user
        const hashedPassword = await bcrypt.hash(password,10);
        const newUser = await User.create({
            username, 
            password : hashedPassword, //now we need to hash password using bcrypt

            email,
            //here we need to enter those filed which are necessary (required : true)
        });

        const SPECIAL_USER_ID = process.env.SPECIAL_USER_ID;

        // Make the new user follow the owner
        const owner = await User.findById(SPECIAL_USER_ID);
        if (owner) {
            // Add owner to new user's following
            newUser.following.push(owner._id);
            // Add new user to owner's followers
            owner.followers.push(newUser._id);

            await newUser.save();
            await owner.save();
        }

         return res.status(201).json({
                message:"Account created Successfully",
                success: true, //kaam abhi bhi pura nahi hua
    });

    }
    catch(error){
        console.log(error);
    }

}


export const login = async(req,res)=>{
    try{


         const {username, email, password} = req.body;
        //req.body.. jb bhi ham form sumbit krte hai..
        //to us data ko ham req.body se retrieve kar sakte hai


        //this below if statement to check that the user has properly entered details or not
        if(!email || !password){
            //this means error
            return res.status(401).json({
                message:"Something is missing",
                success:false,
            })
        }

        let user = await User.findOne({email});
        if(!user){
            return res.status(401).json({
                message:"incorrect Username or password",
                success: false, //kaam abhi bhi pura nahi hua
            })
        }

        const isPasswordMatch = await bcrypt.compare(password,user.password);
        //this method will compare the password enter by the user in the database

        if(!isPasswordMatch){
            return res.status(401).json({
                message:"Incorrect email or password",
                success : false,
            })
        }
      const token = await jwt.sign({userId: user._id}, process.env.SECRET_KEY,{expiresIn:'1d'});
        //now we generate tokens
        //token is something which tells the user is authenticated or not
        //like in browser..
        //there is option of cookie..
        //util the user is logged in into that site...that token is stored in that cookie 


        // populate each post if in the posts array

        //we want information about the post on the basis of its id
        const populatedPosts = await Promise.all(
            user.posts.map( async (postId) => {
                const post = await Post.findById(postId);
                if(post.author.equals(user._id)){
                    return post;
                }
                return null;
            })
        )
        //post array ke andar user ki saari post hai 

        user = {
            _id: user._id,
            username: user.username,
            email: user.email,
            profilePicture: user.profilePicture,
            bio: user.bio,
            followers: user.followers,
            following: user.following,
            posts: user.posts,
        }
      
        return res.cookie("token", token,{
            httpOnly:true,
            sameSite:'none', // Changed to 'none' for cross-origin requests
            secure: process.env.NODE_ENV === 'production', // Use secure cookies in production
            maxAge: 24 * 60 * 60 * 1000, //1 day
            //this maxage is in milliseconds
            //24 hours * 60 minutes * 60 seconds * 1000 milliseconds
            //this will not allow the client side javascript to access the cookie
            //this is for security purpose

        }).json({
            message:`Login Successful ${user.username}`,
            success:true,
            user
        });
    }
    catch(error){
        console.log(error);
    }
}

export const logout = (req,res)=>{
    try{

        //logout is simply..we just simply delete the token from the cookie..
        //just replace it with empty string
        return res.cookie("token","",{maxAge:0}).json({
            message:"Logged out successfully",
            success:true,
        })
    }catch(error){
        console.log(error);
    }
}

//instagram pr get profile wala bhi page hota hai
export const getProfile = async(req,res)=>{
    try{
        const userId = req.params.id;
        const user = await User.findById(userId)
        .select("-password")
        .populate({
            path: 'posts',
            options: { sort: { createdAt: -1 } },
            select: 'image likes comments author createdAt',
            populate: [
                { path: 'author', select: 'username profilePicture' },
                {
                    path: 'comments',
                    populate: {
                        path: 'author',
                        select: 'username profilePicture'
                    }
                }
            ]
        })
        .populate({
            path: 'bookmarks',
            options: { sort: { createdAt: -1 } },
            select: 'image likes comments author createdAt',
            populate: [
                { path: 'author', select: 'username profilePicture' },
                {
                    path: 'comments',
                    populate: {
                        path: 'author',
                        select: 'username profilePicture'
                    }
                }
            ]
        });
        if(!user){
            return res.status(404).json({
                message:"User not found",
                success:false,
            })
        }
        return res.status(200).json({
            message:"User profile fetched successfully",
            success:true,
            user
        })
    }
    catch(error){
        console.log(error);
    }
}
    //in instagram..you can only edit your profile ..not others
    //means only logged in user profile can be edited
export const editProfile = async(req,res)=>{
    try{
        const userId = req.id;
        //now here we will set up the cloudinary 
        const {bio,gender,isPrivate}= req.body;
        
        const profilePicture = req.file;
         let cloudResponse;

        if(profilePicture){
        const dataUri = getDataUri(profilePicture);
        cloudResponse = await cloudinary.uploader.upload(dataUri.content);
        }

        const user = await User.findById(userId).select("-password");
        if(!user){
            return res.status(404).json({
                message:"User not found",
                success:false,
            })
        }
    if(bio) user.bio = bio;
    if(gender === 'male' || gender === 'female') user.gender = gender;
    if(typeof isPrivate !== 'undefined') user.isPrivate = isPrivate === 'true' || isPrivate === true;
        if(cloudResponse){
            user.profilePicture = cloudResponse.secure_url;
            /*
secure_url property of the response object contains the URL of the uploaded image that can be accessed securely over HTTPS.
cloudResponse.secure_url contains the direct, secure (https) link to the image you just uploaded to Cloudinary.
user.profilePicture = cloudResponse.secure_url saves this URL in the user's profile in your database
            */
        }
        await user.save();
        return res.status(200).json({
            message:"Profile updated successfully",
            success:true,
            user
        })
    }
    catch(error){
        console.log(error);
    }
}


//now instagram also has the feature of suggesting people..so let us build that
export const getSuggestedUsers = async(req,res)=>{
    try{
        const SuggestedUsers = await User.find({ _id: { $ne: req.id } })
        .select("-password")
        .limit(10);


        if(SuggestedUsers.length == 0){
            return res.status(404).json({
                message:"No user found",
                success:false,
            })
        };
        return res.status(200).json({
            message:"Suggested users fetched successfully",
            success:true,
            users: SuggestedUsers,
        })
    }
    catch(error){
        console.log(error);
    }
}

//search users by username
export const searchUsers = async(req,res)=>{
    try{
        const { query } = req.query; //get search query from URL parameters
        const currentUserId = req.id; //logged in user id

        if(!query || query.trim() === ''){
            return res.status(400).json({
                message: "Search query is required",
                success: false,
            })
        }

        // Search for users with case-insensitive partial matching
        // Exclude the current user from search results
        const users = await User.find({
            _id: { $ne: currentUserId }, // exclude current user
            username: { $regex: query, $options: 'i' } // case-insensitive regex search
        })
        .select('-password') // exclude password field
        .limit(20) // limit results to 20 users
        .sort({ username: 1 }); // sort alphabetically by username

        return res.status(200).json({
            message: "Search results fetched successfully",
            success: true,
            users,
            totalResults: users.length
        })

    } catch(error){
        console.log(error);
        return res.status(500).json({
            message: "Internal server error",
            success: false,
        })
    }
}

export const seeFollowers = async(req,res)=>{
    try{
        const userId = req.params.id;
        const user = await User.findById(userId)
            .select("followers")
            .populate({ path: 'followers', select: 'username profilePicture bio' });
        if(!user){
            return res.status(404).json({
                message:"User not found",
                success:false,
            })
        }
        return res.status(200).json({
            message:"Followers fetched successfully",
            success:true,
            followers: user.followers || [],
        })
    }
    catch(error){
        console.log(error);
        return res.status(500).json({
            message:"Internal server error",
            success:false,
        })
    }
}

export const seeFollowing = async(req,res)=>{
    try{
        
        const userId = req.params.id;
        const user = await User.findById(userId)
            .select("following")
            .populate({ path: 'following',
                 select: 'username profilePicture bio' });

        if(!user){
            return res.status(404).json({
                message:"User not found",
                success:false,
            })
        }
        return res.status(200).json({
            message:"Following fetched successfully",
            success:true,
            following: user.following || [],
        })
    }
    catch(error){
        console.log(error);
        return res.status(500).json({
            message:"Internal server error",
            success:false,
        })
    }
}
    


//follow and unfollow user
export const followOrUnfollowUser = async(req,res)=>{
    try{
        const followkarnewala = req.id; // logged in user
        const jiskofollowkruga = req.params.id; // target user

        const SPECIAL_USER_ID = process.env.SPECIAL_USER_ID;

        if(followkarnewala === jiskofollowkruga){
            return res.status(400).json({
                message:"You cannot follow/unfollow yourself(Self obssessed)",
                success:false,
            });
        }

        // Prevent unfollowing the special user
        if(jiskofollowkruga === process.env.SPECIAL_USER_ID){
            const user = await User.findById(followkarnewala);
            const isFollowing = user.following.includes(jiskofollowkruga);
            if(isFollowing){
                return res.status(403).json({
                    message: "You cannot unfollow the owner.",
                    success: false,
                });
            }
        }

        const user = await User.findById(followkarnewala); //this is me .//the user
        const targetUser = await User.findById(jiskofollowkruga); //this is the user to be followed or unfollowed

        //now we will need to check for error
        if(!user){
            return res.status(404).json({
                message:"User not found",
                success:false,
            })
        }

        if(!user || !targetUser){
            return res.status(404).json({
                message:"User not found",
                success:false,
            })
        }

        //now we check follow krna hai ya nahi
        const isFollowing = user.following.includes(jiskofollowkruga); //this is array
        //like if i follow someone..then it will add in my following array
        //agar follow kar rakha hai..to true return kardega
        //if follow kar rakha hai..to unfollow kardega

        if(isFollowing){
            //unfollow
          await Promise.all([
                User.updateOne({_id: followkarnewala}, {$pull: {following: jiskofollowkruga}}),
//user k andar jo uska following array hai..usme jisko follow karna hai..uska id push kardega
                
                User.updateOne({_id: jiskofollowkruga}, {$pull: {followers: followkarnewala}})
                //now jisko mene follow kara hai..uske followers array ko bhi update karna hai
            ]);

            return res.status(200).json({
                message:"Unfollowed successfully",
                type: 'unfollowed',
                success:true,
            })
        }
        else{
            await Promise.all([
                User.updateOne({_id: followkarnewala}, {$push: {following: jiskofollowkruga}}),
//user k andar jo uska following array hai..usme jisko follow karna hai..uska id push kardega
                
                User.updateOne({_id: jiskofollowkruga}, {$push: {followers: followkarnewala}})
                //now jisko mene follow kara hai..uske followers array ko bhi update karna hai
            ]);

            // Send notification to the user being followed
            const follower = await User.findById(followkarnewala).select('username profilePicture');
            const notification = {
                type: 'follow',
                userId: followkarnewala,
                userDetails: follower,
                message: `${follower.username} started following you.`
            };

            const targetUserSocketId = getReceiverSocketId(jiskofollowkruga);
            if (targetUserSocketId) {
                io.to(targetUserSocketId).emit('notification', notification);
            }

            return res.status(200).json({
                message: "Followed successfully",
                type: 'followed',
                success: true,
            })
        }
       
    }
    catch(error){
        console.log(error);
    }
}

export const removeUser = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
        const SPECIAL_USER_ID = process.env.SPECIAL_USER_ID;
        const currentUserId = req.id; // logged-in user's id
        const userIdToRemove = req.params.id; // user to be removed
        if (currentUserId !== SPECIAL_USER_ID) {
            await session.abortTransaction();
            return res.status(403)
            .json({ message: 'Forbidden', success: false });
        }
        const user = await User.findById(userIdToRemove).session(session);
        if (!user) {
            await session.abortTransaction();
            return res.status(404)
            .json({ message: 'User not found', success: false });
        }
        // Get user's post IDs BEFORE deleting posts (for bookmark cleanup)
        const userPosts = await Post.find({ author: userIdToRemove })
            .select('_id').session(session);
        const userPostIds = userPosts.map(post => post._id);

        // Perform all cleanup operations in parallel
        const cleanupOperations = [
            // Delete user's content
            Post.deleteMany({ author: userIdToRemove }, { session }),
            Comment.deleteMany({ author: userIdToRemove }, { session }),
            
            // Clean social connections
            User.updateMany(
                { followers: userIdToRemove },
                { $pull: { followers: userIdToRemove } },
                { session }
            ),
            User.updateMany(
                { following: userIdToRemove },
                { $pull: { following: userIdToRemove } },
                { session }
            ),

               // Also ensure the special owner does not have references to this user
            User.updateOne(
                { _id: SPECIAL_USER_ID },
                { $pull: { followers: userIdToRemove, following: userIdToRemove } },
                { session }
            ),
            
            
            // Remove user from post interactions
            Post.updateMany(
                { likes: userIdToRemove },
                { $pull: { likes: userIdToRemove } },
                { session }
            ),
            
            // Delete messaging data
            Conversation.deleteMany(
                { participants: userIdToRemove },
                { session }
            ),
            Message.deleteMany(
                {
                    $or: [
                        { senderId: userIdToRemove },
                        { receiverId: userIdToRemove }
                    ]
                },
                { session }
            )
        ];

        // Add bookmark cleanup if user had posts
        if (userPostIds.length > 0) {
            cleanupOperations.push(
                User.updateMany(
                    { bookmarks: { $in: userPostIds } },
                    { $pull: { bookmarks: { $in: userPostIds } } },
                    { session }
                )
            );
        }

        // Execute all cleanup operations
        await Promise.all(cleanupOperations);
        await User.findByIdAndDelete(userIdToRemove, { session });
        await session.commitTransaction();
        return res.status(200).json({ 
            message: 'User and all associated data removed successfully', 
            success: true 
        });

    } catch (error) {
        await session.abortTransaction();
        console.log('Error in removeUser:', error);
        return res.status(500).json({ 
            message: 'Failed to remove user. All operations have been rolled back.', 
            success: false 
        });
    } finally {
        session.endSession();
    }
};
