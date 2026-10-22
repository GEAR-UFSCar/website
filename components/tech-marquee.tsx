"use client"

import { motion } from "framer-motion"

import { MarqueeRow } from "@/components/marquee-row"

const techItems = [
  "ROS 2",
  "PYTHON",
  "PYTORCH",
  "YOLO",
  "ARDUINO",
  "WEBOTS",
  "SLAM",
  "C++",
]

export function TechMarquee() {
  return (
    <section className="relative py-24 overflow-hidden md:py-32">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.8 }}
        className="px-8 md:px-12 mb-16"
      >
        <h2 className="font-sans text-3xl md:text-5xl font-light italic">O que roda nos robôs</h2>
      </motion.div>

      <MarqueeRow items={techItems} direction="left" />
    </section>
  )
}
