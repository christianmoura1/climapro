import React from 'react';
import { Card, CardHeader } from "@/components/ui/card";
import { TrendingUp } from "lucide-react";

export default function StatsCard({ title, value, icon: Icon, bgColor, trend }) {
  return (
    <Card className="relative overflow-hidden border-none shadow-sm hover:shadow-md transition-shadow">
      <CardHeader className="p-6">
        <div className="flex justify-between items-start">
          <div>
            <p className="text-sm font-medium text-muted-foreground mb-1">{title}</p>
            <p className="text-3xl font-bold text-foreground tracking-tight">{value}</p>
          </div>
          <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${bgColor}/10`}>
            <Icon className={`w-5 h-5 ${bgColor.replace('bg-', 'text-')}`} />
          </div>
        </div>
        {trend && (
          <div className="flex items-center mt-3 text-sm">
            <TrendingUp className="w-4 h-4 mr-1 text-emerald-500" />
            <span className="text-muted-foreground">{trend}</span>
          </div>
        )}
      </CardHeader>
    </Card>
  );
}