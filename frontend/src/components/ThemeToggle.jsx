import React from 'react';

const ThemeToggle = ({ isChecked, onChange, className = '' }) => {
  return (
    <div className={`relative ${className}`}>
      <input
        type="checkbox"
        id="theme-toggle"
        checked={isChecked}
        onChange={onChange}
        className="sr-only"
      />
      <label
        htmlFor="theme-toggle"
        className={`
          relative cursor-pointer inline-block w-[200px] h-[100px] rounded-[50px] 
          transition-all duration-500 overflow-hidden
          ${isChecked ? 'bg-sky-400' : 'bg-purple-900'}
        `}
      >
        {/* Toggle Button (Moon/Sun) */}
        <span
          className={`
            absolute inline-block top-[7px] left-[6px] w-[86px] h-[86px] 
            rounded-full overflow-hidden transition-all duration-500 ease-out
            shadow-[0_0_35px_4px_rgba(255,255,255,0.8)]
            ${isChecked 
              ? 'bg-white transform translate-x-[102px]' 
              : 'bg-gray-100 transform translate-x-0'
            }
          `}
        >
          {/* Moon Craters (visible when dark mode) */}
          {!isChecked && (
            <>
              <span className="absolute inline-block bg-white rounded-full w-[86px] h-[86px] left-[10px] bottom-[10px]"></span>
              <span className="absolute inline-block bg-gray-200 rounded-full w-5 h-5 top-[-7px] left-[44px]"></span>
              <span className="absolute inline-block bg-gray-200 rounded-full w-4 h-4 top-5 right-[-4px]"></span>
              <span className="absolute inline-block bg-gray-200 rounded-full w-[10px] h-[10px] top-6 left-[30px]"></span>
              <span className="absolute inline-block bg-gray-200 rounded-full w-[15px] h-[15px] top-10 left-[48px]"></span>
              <span className="absolute inline-block bg-gray-200 rounded-full w-[10px] h-[10px] top-12 left-5"></span>
              <span className="absolute inline-block bg-gray-200 rounded-full w-3 h-3 bottom-[5px] left-[35px]"></span>
            </>
          )}
          
          {/* Sun rays (visible when light mode) */}
          {isChecked && (
            <>
              <span className="absolute w-10 h-[10px] rounded-[10px] bg-yellow-300 left-5 top-6"></span>
              <span className="absolute w-3 h-3 bg-yellow-400 left-[26px] top-[23px] rounded-full shadow-sm"></span>
              <span className="absolute w-4 h-4 bg-yellow-400 left-[35px] top-[19px] rounded-full shadow-sm"></span>
              <span className="absolute w-[14px] h-[14px] bg-yellow-400 left-[46px] top-[21px] rounded-full shadow-sm"></span>
              <span className="absolute w-[60px] h-[15px] rounded-[15px] bg-yellow-300 left-[30px] bottom-5"></span>
              <span className="absolute w-[18px] h-[18px] bg-yellow-400 rounded-full left-[38px] bottom-5 shadow-sm"></span>
              <span className="absolute w-6 h-6 bg-yellow-400 rounded-full left-[52px] bottom-5 shadow-sm"></span>
              <span className="absolute w-[21px] h-[21px] bg-yellow-400 rounded-full left-[70px] top-[59px] shadow-sm"></span>
            </>
          )}
        </span>

        {/* Stars (visible when dark mode) */}
        {!isChecked && (
          <>
            <span className="absolute inline-block w-[6px] h-[6px] rounded-full bg-white right-[90px] bottom-10 shadow-white shadow-sm"></span>
            <span className="absolute inline-block w-2 h-2 rounded-full bg-white right-[70px] top-[10px] shadow-white shadow-sm"></span>
            <span className="absolute inline-block w-[5px] h-[5px] rounded-full bg-white right-[60px] bottom-[15px] shadow-white shadow-sm"></span>
            <span className="absolute inline-block w-[3px] h-[3px] rounded-full bg-white right-10 bottom-[50px] shadow-white shadow-sm"></span>
            <span className="absolute inline-block w-1 h-1 rounded-full bg-white right-[10px] bottom-[35px] shadow-white shadow-sm"></span>
            
            {/* Shooting stars */}
            <span className="absolute w-[10px] h-[2px] rounded-sm bg-white right-[30px] bottom-[30px] transform rotate-[-45deg] shadow-[5px_0px_4px_1px_#FFF] animate-pulse"></span>
            <span className="absolute w-[10px] h-[2px] rounded-sm bg-white right-[50px] bottom-[60px] transform rotate-[-45deg] shadow-[5px_0px_4px_1px_#FFF] animate-pulse"></span>
            <span className="absolute w-[10px] h-[2px] rounded-sm bg-white right-[90px] top-[10px] transform rotate-[-45deg] shadow-[5px_0px_4px_1px_#FFF] animate-pulse"></span>
          </>
        )}

        {/* Clouds (visible when light mode) */}
        {isChecked && (
          <>
            <span className="absolute w-8 h-2 rounded-full bg-white/80 left-4 top-8 animate-pulse"></span>
            <span className="absolute w-6 h-2 rounded-full bg-white/60 left-8 top-12 animate-pulse"></span>
            <span className="absolute w-10 h-3 rounded-full bg-white/70 right-4 top-6 animate-pulse"></span>
            <span className="absolute w-5 h-2 rounded-full bg-white/50 right-8 bottom-8 animate-pulse"></span>
          </>
        )}
      </label>
    </div>
  );
};

export default ThemeToggle;
