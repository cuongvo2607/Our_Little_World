'use client';

import React, { useEffect, useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Smartphone, Share, PlusSquare, CheckCircle, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function InstallPage() {
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const isStandaloneMode =
        window.matchMedia('(display-mode: standalone)').matches ||
        (window.navigator as any).standalone === true;
      setIsStandalone(isStandaloneMode);
    }
  }, []);

  return (
    <div className="space-y-5 py-2">
      <div className="flex items-center justify-between">
        <Link
          href="/"
          className="p-2 text-gray-500 hover:text-rose-500 rounded-full min-h-[44px] min-w-[44px] flex items-center justify-center"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-base font-bold text-charcoal-800 dark:text-cream-50">
          Cài Đặt Ứng Dụng PWA
        </h1>
        <div className="w-9" />
      </div>

      {isStandalone ? (
        <Card className="text-center py-8 bg-emerald-50/60 dark:bg-emerald-950/30 border-emerald-200 space-y-3">
          <CheckCircle className="w-12 h-12 mx-auto text-emerald-500" />
          <h2 className="text-base font-bold text-emerald-800 dark:text-emerald-200">
            Ứng dụng đã được cài đặt! ❤️
          </h2>
          <p className="text-xs text-gray-500 max-w-xs mx-auto">
            Bạn đang trải nghiệm Our Little World ở chế độ Native PWA trên iPhone.
          </p>
          <Link href="/">
            <Button size="sm" className="mt-2 bg-emerald-500 text-white">
              Về trang chủ
            </Button>
          </Link>
        </Card>
      ) : (
        <div className="space-y-4">
          <Card className="p-4 bg-gradient-to-b from-rose-100/70 to-cream-50 dark:from-rose-950/40 dark:to-charcoal-900 border-rose-200 space-y-2 text-center">
            <Smartphone className="w-10 h-10 mx-auto text-rose-500 animate-bounce" />
            <h2 className="text-base font-bold text-charcoal-800 dark:text-cream-50">
              Cài đặt lên màn hình chính iPhone
            </h2>
            <p className="text-xs text-gray-500">
              Trải nghiệm ứng dụng mượt mà không có thanh địa chỉ trình duyệt, hoạt động như app gốc!
            </p>
          </Card>

          <Card className="p-4 space-y-4">
            <h3 className="text-xs font-bold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
              Các bước thực hiện trên Safari iPhone:
            </h3>

            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-7 h-7 rounded-full bg-rose-100 dark:bg-rose-950 text-rose-600 font-bold text-xs flex items-center justify-center shrink-0">
                  1
                </div>
                <div>
                  <h4 className="text-xs font-bold text-charcoal-800 dark:text-cream-50">
                    Mở trình duyệt Safari
                  </h4>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Đảm bảo bạn đang truy cập trang web này bằng trình duyệt Safari trên iPhone.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-7 h-7 rounded-full bg-rose-100 dark:bg-rose-950 text-rose-600 font-bold text-xs flex items-center justify-center shrink-0">
                  2
                </div>
                <div>
                  <h4 className="text-xs font-bold text-charcoal-800 dark:text-cream-50 flex items-center gap-1.5">
                    Bấm nút Chia sẻ <Share className="w-4 h-4 text-blue-500" />
                  </h4>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Nhấn vào biểu tượng Chia sẻ (Share) ở thanh công cụ phía dưới màn hình iPhone.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-7 h-7 rounded-full bg-rose-100 dark:bg-rose-950 text-rose-600 font-bold text-xs flex items-center justify-center shrink-0">
                  3
                </div>
                <div>
                  <h4 className="text-xs font-bold text-charcoal-800 dark:text-cream-50 flex items-center gap-1.5">
                    Chọn "Thêm vào MH chính" <PlusSquare className="w-4 h-4 text-rose-500" />
                  </h4>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Cuộn xuống danh sách tùy chọn và nhấn chọn "Thêm vào MH chính" (Add to Home Screen).
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-7 h-7 rounded-full bg-rose-100 dark:bg-rose-950 text-rose-600 font-bold text-xs flex items-center justify-center shrink-0">
                  4
                </div>
                <div>
                  <h4 className="text-xs font-bold text-charcoal-800 dark:text-cream-50">
                    Bấm "Thêm" ở góc trên bên phải
                  </h4>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Biểu tượng trái tim của "Our Little World" sẽ xuất hiện trên màn hình chính iPhone của hai bạn!
                  </p>
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
