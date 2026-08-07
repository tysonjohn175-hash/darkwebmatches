import { Link } from 'react-router-dom'

const Hero = () => {
  return (
    <section className="bg-gradient-to-r from-accent to-green-700 rounded-2xl p-6 text-white text-center shadow-lg">
      <div className="flex flex-col items-center">
        <span className="text-sm bg-black/30 text-white px-3 py-1 rounded-full font-semibold mb-2">
          🎁 NEW USER OFFER
        </span>
        <h1 className="text-4xl md:text-6xl font-extrabold leading-tight">
          Join Now for <span className="text-yellow-300">$10 USD</span> Free Bet
        </h1>
        <p className="text-xl md:text-2xl font-light mt-2">
          Get started with a free bet on us
        </p>
        <Link
          to="/register"
          className="mt-4 bg-black/30 hover:bg-black/50 text-white font-bold py-3 px-8 rounded-full transition transform hover:scale-105 inline-block backdrop-blur-sm"
        >
          Join Now
        </Link>
      </div>
    </section>
  )
}

export default Hero