import React, { useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Sparkles, Clock3 } from 'lucide-react';

export default function HeroSection({ userName, stats, onCreateMemory, onViewStories }) {
  const heroRef = useRef(null);
  const [hoverPosition, setHoverPosition] = useState({ x: 50, y: 50 });

  const handleMouseMove = (event) => {
    const bounds = heroRef.current?.getBoundingClientRect();
    if (!bounds) return;
    const x = ((event.clientX - bounds.left) / bounds.width) * 100;
    const y = ((event.clientY - bounds.top) / bounds.height) * 100;
    setHoverPosition({ x, y });
  };

  const gradientStyle = useMemo(
    () => ({
      background: `radial-gradient(circle at ${hoverPosition.x}% ${hoverPosition.y}%, rgba(45, 212, 191, 0.15), rgba(30, 64, 175, 0.05) 40%, transparent 65%)`,
    }),
    [hoverPosition]
  );

  return (
    <section
      ref={heroRef}
      onMouseMove={handleMouseMove}
      className="dashboard-hero"
    >
      <div className="absolute inset-0 pointer-events-none" style={gradientStyle} />
      <div className="floating-orb orb-one" />
      <div className="floating-orb orb-two" />

      <div className="relative z-10 mx-auto flex w-full max-w-6xl flex-col gap-12 px-6 sm:px-10">
        <motion.div
          initial={{ opacity: 0, y: 28 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: 'easeOut' }}
          className="grid gap-8 lg:grid-cols-[1.7fr,1fr]"
        >
          <div className="space-y-8">
            <div className="inline-flex items-center gap-3 rounded-full border border-white/5 bg-white/5 px-5 py-2 text-sm text-emerald-200">
              <Sparkles className="h-4 w-4" />
              <span>Chào mừng trở lại, {userName}</span>
            </div>
            <div className="space-y-5">
              <h1 className="text-4xl font-bold tracking-tight text-slate-50 sm:text-5xl lg:text-6xl">
                Hành trình của bạn được kết nối
                <span className="block bg-gradient-to-r from-emerald-300 via-cyan-300 to-sky-400 bg-clip-text text-transparent"> theo cách riêng tư nhất</span>
              </h1>
              <p className="max-w-2xl text-base text-slate-300 sm:text-lg">
                Theo dõi cảm xúc, hình ảnh và địa điểm trong một không gian tương tác. Nhìn lại hành trình cuộc đời theo thời gian, theo mood và theo những người đồng hành.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-4">
              <motion.button
                whileHover={{ scale: 1.02, y: -3 }}
                whileTap={{ scale: 0.98 }}
                onClick={onCreateMemory}
                className="group inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-500 px-6 py-3 font-semibold text-slate-900 shadow-lg shadow-emerald-500/30"
              >
                Ghi lại ký ức mới
                <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" />
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.02 }}
                onClick={onViewStories}
                className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-5 py-3 text-sm font-semibold text-slate-200"
              >
                Xem dòng thời gian
                <Clock3 className="h-4 w-4 text-slate-400" />
              </motion.button>
            </div>
          </div>

          <motion.div
            className="glass-surface flex h-full flex-col justify-between rounded-3xl p-6"
            initial={{ opacity: 0, y: 28 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.15, ease: 'easeOut' }}
          >
            <div>
              <p className="text-sm uppercase tracking-[0.3em] text-slate-400">Lộ trình tuần này</p>
              <h3 className="mt-3 text-2xl font-bold text-slate-100">Trốn tìm giữa mùa hè Santorini</h3>
              <p className="mt-3 text-sm text-slate-400">
                6 ghi chú mới, 14 địa điểm được đánh dấu và 3 kỷ niệm đang chờ hoàn thiện.
              </p>
            </div>
            <div className="mt-6 flex items-end justify-between">
              <div>
                <p className="text-xs uppercase tracking-widest text-slate-500">Tiếp theo</p>
                <p className="text-lg font-semibold text-emerald-300">Sunset Sailing</p>
                <p className="text-xs text-slate-500">18:30 - Bến tàu Ammoudi</p>
              </div>
              <div className="rounded-2xl bg-slate-900/60 px-5 py-3 text-right">
                <p className="text-xs text-slate-400">Chuỗi cảm xúc</p>
                <p className="text-xl font-bold text-slate-100">7 ngày</p>
              </div>
            </div>
          </motion.div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 28 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.25, ease: 'easeOut' }}
          className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4"
        >
          {stats.map((stat) => {
            const Icon = stat.icon;
            return (
              <motion.div
                key={stat.id}
                whileHover={{ y: -8, rotateX: 2, rotateY: -2 }}
                transition={{ type: 'spring', stiffness: 250, damping: 16 }}
                className="glass-surface rounded-2xl p-5"
              >
                <div className={`mb-5 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br ${stat.accent} text-slate-900`}> 
                  <Icon className="h-5 w-5" />
                </div>
                <p className="text-xs uppercase tracking-[0.25em] text-slate-400">{stat.label}</p>
                <p className="mt-2 text-3xl font-semibold text-slate-50">{stat.value}</p>
                <p className="mt-2 text-xs text-emerald-200/80">{stat.delta}</p>
              </motion.div>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
}
