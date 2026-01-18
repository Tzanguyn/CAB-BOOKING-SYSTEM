import React from 'react';
import Button from '../../components/common/button';

const HomePage: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100">
      <div className="w-full py-2 px-4 rounded font-bold transition duration-200 grid gap-10 justify-center items-center cursor-pointer">
            <a href="/customer/logout"><Button>Logout</Button></a>
      </div>
    </div>
  );
};

export default HomePage;