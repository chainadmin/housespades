import { useEffect } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import houseCardLogo from "@/assets/house-card-logo.png";
import chainLogo from "@/assets/12by12.jpg";

export default function Splash() {
  const [, navigate] = useLocation();

  useEffect(() => {
    const timer = setTimeout(() => {
      navigate("/login");
    }, 2500);
    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="flex flex-col items-center"
      >
        <img 
          src={houseCardLogo} 
          alt="House Spades" 
          className="w-32 h-32 sm:w-40 sm:h-40 object-contain mb-6"
        />
        <motion.h1 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.5 }}
          className="text-3xl sm:text-4xl font-bold tracking-tight"
        >
          House Spades
        </motion.h1>
      </motion.div>

      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1, duration: 0.5 }}
        className="absolute bottom-8 flex flex-col items-center gap-2"
      >
        <span className="text-xs text-muted-foreground">Powered by</span>
        <div className="flex items-center gap-2">
          <img 
            src={chainLogo} 
            alt="Chain Software Group" 
            className="w-8 h-8 object-contain"
          />
          <span className="text-sm font-medium text-muted-foreground">Chain Software Group</span>
        </div>
      </motion.div>
    </div>
  );
}
