import React from 'react';
import { Player } from '@lottiefiles/react-lottie-player';
import treeAnimation from '../assets/tree.json'; 
const ChristmasTree = () => {
  return (
    <div 
      className="relative z-0 pointer-events-none select-none flex flex-col items-center mx-auto mb-[-35px]"
      style={{ 
        width: '260px',  
        height: '270px', 
        left: '-20px',
        filter: 'drop-shadow(0 5px 15px rgba(0,0,0,0.5))' 
      }}
    >
      <Player
        autoplay
        loop
        src={treeAnimation}
        style={{ height: '100%', width: '100%' }}
      />
    </div>
  );
};

export default ChristmasTree;