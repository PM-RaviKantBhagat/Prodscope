import Link from "next/link";

export const metadata = { title: "Offline | Prodscope" };

export default function Offline() {
  return (
    <article className="page narrow">
      <div className="eyebrow">No internet</div>
      <h1>You are offline.</h1>
      <p className="lede">Pages you opened before still work. Connect to the internet to play new games or open new teardowns.</p>
      <Link className="btn" href="/">Try again</Link>
    </article>
  );
}
