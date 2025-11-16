import React from 'react';
import { motion } from 'framer-motion';

const quickActionVariant = {
  hidden: { opacity: 0, y: 35 },
  visible: (index) => ({
    opacity: 1,
    y: 0,
    transition: { delay: index * 0.08, duration: 0.45, ease: 'easeOut' },
  }),
};

const highlightVariant = {
  hidden: { opacity: 0, y: 30 },
  visible: (index) => ({
    opacity: 1,
    y: 0,
    transition: { delay: 0.2 + index * 0.1, duration: 0.55, ease: 'easeOut' },
  }),
};

export default function FeaturesSection({ quickActions = [], journeyHighlights = [] }) {
  return (
    <section className="relative py-16 sm:py-24">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-white/3 to-transparent" />
      <div className="relative z-10 mx-auto flex w-full max-w-6xl flex-col gap-12 px-6 sm:px-10 lg:flex-row">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.4 }}
          className="w-full space-y-6 lg:w-7/12"
        >
          <div className="space-y-2">
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-emerald-200/70">Hành động nhanh</p>
            <h2 className="text-3xl font-bold text-slate-50 sm:text-4xl">Khởi tạo ký ức theo cách bạn muốn</h2>
            <p className="text-base text-slate-300">
              Từ việc viết nhật ký cảm xúc, ghim địa điểm đến chia sẻ với bạn bè – tất cả được gói gọn trong vài thao tác.
            </p>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            {quickActions.map((action, index) => {
              const Icon = action.icon;
              return (
                <motion.button
                  key={action.id}
                  custom={index}
                  variants={quickActionVariant}
                  whileHover={{ y: -6, scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                  onClick={action.onClick}
                  className="group rounded-3xl border border-white/5 bg-white/5 p-6 text-left shadow-lg shadow-emerald-500/5"
                >
                  <div className={`inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br ${action.accent} text-slate-900 transition-transform group-hover:scale-110`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="mt-5 text-lg font-semibold text-slate-100">{action.title}</h3>
                  <p className="mt-2 text-sm text-slate-300/80">{action.description}</p>
                  <span className="mt-4 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.25em] text-emerald-200/70">
                    Bắt đầu ngay
                    <span className="block h-px w-6 bg-gradient-to-r from-emerald-200 to-transparent" />
                  </span>
                </motion.button>
              );
            })}
          </div>
        </motion.div>

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.3 }}
          className="w-full space-y-6 lg:w-5/12"
        >
          <div className="space-y-2">
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-cyan-200/70">Highlight hành trình</p>
            <h3 className="text-2xl font-semibold text-slate-100">Bức tranh cảm xúc của bạn</h3>
            <p className="text-sm text-slate-400">
              Phân tích tự động giúp bạn nhận diện những khoảnh khắc mang lại nhiều cảm hứng nhất.
            </p>
          </div>

          <div className="space-y-4">
            {journeyHighlights.map((highlight, index) => (
              <motion.div
                key={highlight.id}
                custom={index}
                variants={highlightVariant}
                className="glass-surface rounded-3xl p-6"
              >
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-xs uppercase tracking-[0.25em] text-slate-400">{highlight.title}</p>
                    <p className="mt-2 text-lg font-semibold text-slate-100">{highlight.mood}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {highlight.palette.map((color, idx) => (
                      <span
                        key={color + idx}
                        className="h-9 w-9 rounded-2xl"
                        style={{ background: color, boxShadow: `0 10px 30px ${color}33` }}
                      />
                    ))}
                  </div>
                </div>
                <p className="mt-3 text-sm text-slate-300/90">{highlight.description}</p>
                <div className="mt-5">
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span>Tiến độ</span>
                    <span className="font-semibold text-emerald-200">{highlight.progress}%</span>
                  </div>
                  <div className="mt-2 h-2 rounded-full bg-white/5">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-emerald-400 via-cyan-400 to-sky-400"
                      style={{ width: `${highlight.progress}%` }}
                    />
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
