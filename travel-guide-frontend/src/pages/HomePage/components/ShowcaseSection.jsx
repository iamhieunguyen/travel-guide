import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, Loader2, ArrowUpRight } from 'lucide-react';

const mapVariants = {
  hidden: { opacity: 0, scale: 0.92, y: 32 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { duration: 0.7, ease: 'easeOut' },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.45, ease: 'easeOut' },
  },
};

export default function ShowcaseSection({ mapMemories = [], onViewAll }) {
  const initialMemory = useMemo(() => mapMemories[0] ?? null, [mapMemories]);
  const [activeMemory, setActiveMemory] = useState(initialMemory);

  return (
    <section className="relative py-16 sm:py-24">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-emerald-500/5 to-transparent" />
      <div className="relative z-10 mx-auto flex w-full max-w-6xl flex-col gap-12 px-6 sm:px-10">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-2">
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-sky-200/80">Bản đồ tương tác</p>
            <h2 className="text-3xl font-bold text-slate-50 sm:text-4xl">Những điểm nhấn vang lên cảm xúc</h2>
            <p className="max-w-2xl text-sm text-slate-300">
              Di chuyển qua từng marker để hồi tưởng lại khoảnh khắc. Bản đồ kết hợp ảnh, cảm xúc và thời tiết để kể lại câu chuyện hành trình.
            </p>
          </div>
          <motion.button
            whileHover={{ scale: 1.02 }}
            onClick={onViewAll}
            className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-5 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-slate-200"
          >
            Xem tất cả ký ức
            <ArrowUpRight className="h-4 w-4 text-slate-400" />
          </motion.button>
        </div>

        <div className="grid gap-8 lg:grid-cols-[1.35fr,1fr]">
          <motion.div
            variants={mapVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.3 }}
            className="glass-surface relative overflow-hidden rounded-[32px] border border-white/5 p-6"
          >
            <div className="h-full w-full rounded-3xl bg-gradient-to-br from-slate-900/60 via-slate-900/30 to-slate-900/50">
              <div className="map-grid-pattern absolute inset-0 opacity-30" />
              <div className="relative h-[420px] w-full">
                {mapMemories.length === 0 && (
                  <div className="flex h-full items-center justify-center text-slate-500">
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Đang tải hành trình của bạn...
                  </div>
                )}

                {mapMemories.map((memory) => (
                  <motion.button
                    key={memory.id}
                    type="button"
                    className="group absolute -translate-x-1/2 -translate-y-1/2"
                    style={{ top: memory.coordinates?.top ?? '50%', left: memory.coordinates?.left ?? '50%' }}
                    onMouseEnter={() => setActiveMemory(memory)}
                    onFocus={() => setActiveMemory(memory)}
                    onClick={() => setActiveMemory(memory)}
                    whileHover={{ scale: 1.18 }}
                    transition={{ type: 'spring', stiffness: 280, damping: 18 }}
                  >
                    <div className="relative">
                      <span className="absolute inset-0 animate-ping rounded-full bg-emerald-400/30" />
                      <span className="absolute inset-0 rounded-full bg-emerald-400/40 blur-xl" />
                      <div className="relative inline-flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 to-cyan-400 text-slate-950 shadow-lg shadow-emerald-400/40">
                        <MapPin className="h-5 w-5" />
                      </div>
                    </div>
                    <span className="mt-2 block text-xs font-semibold uppercase tracking-[0.3em] text-emerald-100/80 opacity-0 transition-opacity group-hover:opacity-100">
                      {memory.mood}
                    </span>
                  </motion.button>
                ))}
              </div>
            </div>
          </motion.div>

          <motion.div
            variants={cardVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.3 }}
            className="glass-surface flex flex-col gap-6 rounded-[32px] p-6"
          >
            <div className="space-y-2">
              <p className="text-sm font-semibold uppercase tracking-[0.3em] text-emerald-200/80">Khoảnh khắc nổi bật</p>
              <h3 className="text-2xl font-semibold text-slate-100">{activeMemory?.title ?? 'Chưa có ký ức được chọn'}</h3>
              <p className="text-sm text-slate-400">{activeMemory?.location ?? 'Di chuyển qua bản đồ để chọn cảm hứng.'}</p>
            </div>

            <div className="relative overflow-hidden rounded-3xl">
              {activeMemory?.image ? (
                <motion.img
                  key={activeMemory.id}
                  src={activeMemory.image}
                  alt={activeMemory.title}
                  initial={{ opacity: 0.2, scale: 1.08 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.55, ease: 'easeOut' }}
                  className="h-48 w-full object-cover"
                />
              ) : (
                <div className="flex h-48 items-center justify-center bg-slate-900/40 text-slate-500">
                  Chọn một ghi nhớ trên bản đồ để xem chi tiết.
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/10 to-transparent" />
              {activeMemory && (
                <div className="absolute bottom-4 left-4 space-y-1 text-sm text-slate-100">
                  <p className="font-semibold text-emerald-200">{activeMemory.mood}</p>
                  <p className="text-xs text-slate-300">{activeMemory.time} · {activeMemory.weather}</p>
                </div>
              )}
            </div>

            <div className="space-y-4">
              <AnimatePresence mode="wait">
                {activeMemory ? (
                  <motion.div
                    key={activeMemory.id}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -12 }}
                    transition={{ duration: 0.35 }}
                    className="rounded-2xl border border-white/5 bg-white/3 p-4 text-sm text-slate-300"
                  >
                    {`"Khi đặt chân đến ${activeMemory.location}, tôi cảm nhận được ${activeMemory.mood.toLowerCase()} trong từng khoảnh khắc."`}
                  </motion.div>
                ) : (
                  <motion.div
                    key="empty"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="rounded-2xl border border-dashed border-white/10 bg-white/5 p-4 text-sm text-slate-400"
                  >
                    Chọn một ghi nhớ để xem cảm xúc và câu chuyện đằng sau nó.
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="grid grid-cols-2 gap-3 text-xs text-slate-400">
                {mapMemories.slice(0, 4).map((memory) => (
                  <button
                    key={`mini-${memory.id}`}
                    onClick={() => setActiveMemory(memory)}
                    className={`overflow-hidden rounded-2xl border border-white/5 bg-white/5 p-3 text-left transition-all ${activeMemory?.id === memory.id ? 'ring-2 ring-emerald-300/70' : 'hover:bg-white/10'}`}
                  >
                    <p className="text-xs font-semibold text-slate-200">{memory.title}</p>
                    <p className="mt-1 text-[11px] text-slate-400">{memory.location}</p>
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
