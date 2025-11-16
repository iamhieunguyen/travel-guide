import React from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, PlusCircle } from 'lucide-react';

const timelineVariants = {
  hidden: { opacity: 0, x: -24 },
  visible: (index) => ({
    opacity: 1,
    x: 0,
    transition: { delay: index * 0.1, duration: 0.5, ease: 'easeOut' },
  }),
};

const collectionVariants = {
  hidden: { opacity: 0, y: 24 },
  visible: (index) => ({
    opacity: 1,
    y: 0,
    transition: { delay: 0.15 + index * 0.1, duration: 0.55, ease: 'easeOut' },
  }),
};

export default function CTASection({ activityTimeline = [], featuredCollections = [], onCreateMemory, onViewPosts }) {
  return (
    <section className="relative py-16 sm:py-24">
      <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-slate-900/60 to-transparent" />
      <div className="relative z-10 mx-auto flex w-full max-w-6xl flex-col gap-12 px-6 sm:px-10">
        <div className="grid gap-10 lg:grid-cols-[1.2fr,1fr]">
          <div>
            <div className="flex items-end justify-between">
              <div className="space-y-2">
                <p className="text-sm font-semibold uppercase tracking-[0.3em] text-emerald-200/80">Hoạt động gần đây</p>
                <h2 className="text-3xl font-bold text-slate-50 sm:text-4xl">Dòng thời gian ký ức</h2>
                <p className="text-sm text-slate-400">Theo dõi những gì bạn đã làm, đang làm và sắp tới – tất cả ở cùng một nơi.</p>
              </div>
              <motion.button
                whileHover={{ scale: 1.02 }}
                onClick={onCreateMemory}
                className="hidden rounded-full border border-emerald-300/40 bg-emerald-400/10 px-5 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-emerald-200 transition-colors hover:bg-emerald-400/20 lg:inline-flex"
              >
                Thêm ký ức mới
              </motion.button>
            </div>

            <div className="relative mt-10 space-y-6">
              <span className="timeline-line" />
              {activityTimeline.map((item, index) => (
                <motion.div
                  key={item.id}
                  custom={index}
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true, amount: 0.4 }}
                  variants={timelineVariants}
                  className="timeline-card"
                >
                  <div className="timeline-dot" data-accent={item.accent} />
                  <div className="glass-surface rounded-3xl p-5">
                    <p className="text-xs uppercase tracking-[0.3em] text-slate-400">{item.time}</p>
                    <h3 className="mt-2 text-lg font-semibold text-slate-50">{item.title}</h3>
                    <p className="mt-2 text-sm text-slate-300">{item.description}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          <div className="space-y-6">
            <div className="space-y-2">
              <p className="text-sm font-semibold uppercase tracking-[0.3em] text-cyan-200/80">Bộ sưu tập nổi bật</p>
              <h3 className="text-2xl font-semibold text-slate-100">Kho lưu trữ riêng của bạn</h3>
              <p className="text-sm text-slate-400">Sắp xếp kỷ niệm theo chủ đề, cảm hứng hoặc những người đồng hành.</p>
            </div>
            <div className="space-y-4">
              {featuredCollections.map((collection, index) => (
                <motion.div
                  key={collection.id}
                  custom={index}
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true, amount: 0.4 }}
                  variants={collectionVariants}
                  className="glass-surface flex items-center justify-between gap-4 rounded-3xl border border-white/5 p-5"
                >
                  <div>
                    <p className="text-xs uppercase tracking-[0.3em] text-slate-400">{collection.count} ghi chú</p>
                    <h4 className="mt-2 text-lg font-semibold text-slate-50">{collection.title}</h4>
                    <p className="mt-2 text-xs text-slate-400">{collection.description}</p>
                  </div>
                  <div className={`h-20 w-20 rounded-3xl bg-gradient-to-br ${collection.gradient} opacity-90 shadow-lg shadow-emerald-500/10`} />
                </motion.div>
              ))}
            </div>

            <motion.div
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.4 }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
              className="glass-surface flex flex-col gap-4 rounded-3xl border border-white/5 p-6"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-emerald-200/80">Sẵn sàng sáng tạo</p>
                  <h4 className="mt-2 text-xl font-semibold text-slate-50">Ghi lại câu chuyện tiếp theo</h4>
                  <p className="mt-2 text-sm text-slate-400">Tạo ký ức mới, gắn cảm xúc và chia sẻ với những người bạn tin tưởng.</p>
                </div>
                <span className="hidden rounded-full bg-emerald-400/20 p-3 text-emerald-200 sm:block">
                  <PlusCircle className="h-6 w-6" />
                </span>
              </div>
              <div className="flex flex-wrap gap-3">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={onCreateMemory}
                  className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-500 px-5 py-3 text-sm font-semibold text-slate-900 shadow-lg shadow-emerald-500/30"
                >
                  Bắt đầu ghi nhớ
                  <ArrowRight className="h-4 w-4" />
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  onClick={onViewPosts}
                  className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-5 py-3 text-sm font-semibold text-slate-200"
                >
                  Xem hành trình đã lưu
                </motion.button>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
}
