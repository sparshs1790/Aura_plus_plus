import React, { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { useSelector } from 'react-redux';
import { Link,useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'sonner'; // or 'react-toastify' if you use that


const Signup = () => {

     const [input, setInput] = useState({
        username: "",
        email: "",
        password: ""
    });

     const [loading, setLoading] = useState(false); //loading start hoga isse
     //band karne k liye ham finally ka use karege
    const {user} = useSelector(store=>store.auth);
    const navigate = useNavigate();
    //this is from react router dom to navigate to different pages
    const url = import.meta.env.VITE_URL || 'http://localhost:5000';

       const changeEventHandler = (e) => {
        setInput({ ...input, [e.target.name]: e.target.value });
    }

    const signupHandler = async (e) => {
        e.preventDefault(); //if we not do this..then our page will get refresh
        try {
            setLoading(true);
            const res = await axios.post(`${url}/api/v1/user/register`, input, {
                headers: {
                    'Content-Type': 'application/json'
                },
                withCredentials: true
                //we will just apply react router dom later 
            });
            if (res.data.success) {
                 navigate("/login");
                toast.success(res.data.message);
               
            }
        } catch (error) {
            console.log(error);
            toast.error(error.response.data.message);
        } finally {
            setLoading(false);
        }
    }

    useEffect(()=>{
        if(user){
            navigate("/");
        }
    },[])

  return (
        <div className='flex items-center w-screen h-screen justify-center'>
            <form onSubmit={signupHandler} className='shadow-lg flex flex-col gap-5 p-8'>
                <div className='my-4'>
                    <img src="/aur3.png" alt="Aura Logo" className="w-40 h-30 mx-auto mb-2" />
                    <h1 className='text-center font-bold text-xl'>Aura++</h1>
                    <p className='text-sm text-center'>Signup to see photos & videos from your friends</p>
                </div>

                <div>
                    <span className='font-medium'>Username</span>
                    <Input
                        type="text"
                        name="username"
                        value={input.username}
                        onChange={changeEventHandler}
                        className="focus-visible:ring-transparent my-2"
                    />
                </div>
                <div>
                    <span className='font-medium'>Email</span>
                    <Input
                        type="email"
                        name="email"
                        value={input.email}
                        onChange={changeEventHandler}
                        className="focus-visible:ring-transparent my-2"
                    />
                </div>
                <div>
                    <span className='font-medium'>Password</span>
                    <Input
                        type="password"
                        name="password"
                        value={input.password}
                        onChange={changeEventHandler}
                        className="focus-visible:ring-transparent my-2"
                    />
                </div>
                {
                    loading ? (
                        <Button>
                            <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                            Please wait
                        </Button>
                    ) : (
                        <Button type='submit'>Signup</Button>
                    )
                }
                <span className='text-center'>Already have an account? <Link to="/login" className='text-blue-600'>Login</Link></span>
            </form>
        </div>
  )
}

export default Signup
