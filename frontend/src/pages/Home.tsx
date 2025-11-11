import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Clock, Users, BarChart3, CheckCircle2 } from "lucide-react";

const Home: React.FC = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("token");
    setIsLoggedIn(!!token);
  }, []);

  const features = [
    {
      title: "Time Tracking",
      desc: "Record your clock-ins and clock-outs with a single click, and visualize your working hours and delays.",
      icon: <Clock className="w-6 h-6 text-yellow-400" />,
    },
    {
      title: "Team Management",
      desc: "Manage your coworkers, monitor their presence, and assign tasks efficiently.",
      icon: <Users className="w-6 h-6 text-blue-400" />,
    },
    {
      title: "Statistics & KPIs",
      desc: "Analyze performance with clear, visual indicators to improve your workflow.",
      icon: <BarChart3 className="w-6 h-6 text-green-400" />,
    },
    {
      title: "Performance & Reliability",
      desc: "Fast, reliable, and connected tools designed for your daily productivity.",
      icon: <CheckCircle2 className="w-6 h-6 text-pink-400" />,
    },
  ];

  const stats = [
    { number: "250+", label: "Active Employees" },
    { number: "32", label: "Teams Managed" },
    { number: "1.2K", label: "Hours Logged / Day" },
    { number: "98%", label: "Satisfaction Rate" },
  ];

  const handleClockRedirect = () => {
    window.location.href = isLoggedIn ? "/clock" : "/login";
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-900 via-blue-800 to-indigo-900 text-white">
      {/* HERO SECTION */}
      <section className="relative py-20 px-4 sm:px-8 lg:px-16 text-center">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="max-w-4xl mx-auto"
        >
          <h1 className="text-5xl font-extrabold mb-6 text-yellow-400 drop-shadow-lg">
            Welcome to <span className="text-white">Epitime</span>
          </h1>
          <p className="text-lg text-blue-100 mb-8">
            Optimize your time, your team, and your performance effortlessly.
          </p>

          <div className="flex justify-center gap-4 flex-wrap">
            {!isLoggedIn && (
              <a
                href="/login"
                className="bg-yellow-400 text-gray-900 font-semibold px-8 py-3 rounded-full hover:bg-yellow-300 transition-all transform hover:scale-105 shadow-lg"
              >
                Sign In
              </a>
            )}

            <button
              onClick={handleClockRedirect}
              className="bg-transparent border-2 border-yellow-400 text-yellow-400 px-8 py-3 rounded-full font-semibold hover:bg-yellow-400 hover:text-gray-900 transition-all transform hover:scale-105"
            >
              Clock In
            </button>
          </div>
        </motion.div>

        {/* IMAGE */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1 }}
          className="mt-16 flex justify-center"
        >
          <img
            src="https://cdn-icons-png.flaticon.com/512/2103/2103691.png"
            alt="Epitime Logo"
            width={250}
            height={250}
            className="drop-shadow-2xl"
          />
        </motion.div>
      </section>

      {/* FEATURES SECTION */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-blue-950/60">
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
          className="max-w-6xl mx-auto"
        >
          <h2 className="text-3xl font-bold text-center text-yellow-400 mb-12">
            Key Features
          </h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((f, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.15, duration: 0.5 }}
                viewport={{ once: true }}
                className="bg-blue-800/30 border border-blue-600 rounded-2xl p-6 text-center hover:scale-105 hover:bg-blue-700/40 transition-all shadow-lg"
              >
                <div className="flex justify-center mb-4">{f.icon}</div>
                <h3 className="text-lg font-semibold text-yellow-300 mb-2">
                  {f.title}
                </h3>
                <p className="text-sm text-blue-100">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </section>

      {/* STATS SECTION */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-r from-indigo-900 to-blue-900">
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
          className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8 text-center"
        >
          {stats.map((s, i) => (
            <motion.div
              key={i}
              whileHover={{ scale: 1.1 }}
              className="group transition-transform"
            >
              <div className="text-4xl font-bold text-yellow-400 group-hover:text-yellow-300 transition mb-2">
                {s.number}
              </div>
              <div className="text-blue-100">{s.label}</div>
            </motion.div>
          ))}
        </motion.div>
      </section>
    </div>
  );
};

export default Home;
