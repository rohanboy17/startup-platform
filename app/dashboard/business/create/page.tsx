"use client";

import Link from "next/link";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function CreateCampaign() {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [reward, setReward] = useState("");
  const [budget, setBudget] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setLoading(true);
    setMessage("");
    setError("");

    const res = await fetch("/api/business/tasks", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        title,
        description,
        reward: Number(reward),
        totalBudget: Number(budget),
      }),
    });

    const data = (await res.json()) as { error?: string };
    setLoading(false);

    if (!res.ok) {
      setError(data.error || "Failed to create campaign");
      return;
    }

    setMessage("Campaign created successfully!");
    setTitle("");
    setDescription("");
    setReward("");
    setBudget("");
  };

  return (
    <div className="max-w-xl space-y-6">
      <h2 className="text-3xl font-semibold">Create Campaign</h2>

      <Input
        placeholder="Campaign Title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
      />

      <Input
        placeholder="Description"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
      />

      <Input
        placeholder="Reward per Task"
        value={reward}
        onChange={(e) => setReward(e.target.value)}
      />

      <Input
        placeholder="Total Budget"
        value={budget}
        onChange={(e) => setBudget(e.target.value)}
      />

      <Button onClick={handleSubmit} className="w-full">
        {loading ? "Launching..." : "Launch Campaign"}
      </Button>

      {error ? <p className="text-sm text-red-400">{error}</p> : null}
      {message ? <p className="text-sm text-emerald-300">{message}</p> : null}

      {error.includes("Insufficient wallet balance") ? (
        <Link
          href="/dashboard/business/funding"
          className="inline-block text-sm text-white underline underline-offset-4"
        >
          Add funds to wallet
        </Link>
      ) : null}
    </div>
  );
}
