import React, { useEffect, useRef } from 'react';
import shieldMarkImg from '../assets/shield-mark.png';

export const SHIELD_PATH =
  'M 633.0 319.0 L 624.0 319.0 L 614.0 323.0 L 436.0 438.0 L 422.0 451.0 L 413.0 464.0 ' +
  'L 406.0 481.0 L 403.0 498.0 L 404.0 555.0 L 408.0 569.0 L 420.0 588.0 L 430.0 597.0 ' +
  'L 646.0 740.0 L 636.0 733.0 L 638.0 731.0 L 637.0 732.0 L 635.0 730.0 L 635.0 723.0 ' +
  'L 633.0 723.0 L 637.0 717.0 L 635.0 715.0 L 637.0 711.0 L 635.0 711.0 L 635.0 708.0 ' +
  'L 638.0 704.0 L 639.0 706.0 L 641.0 698.0 L 643.0 698.0 L 641.0 696.0 L 643.0 693.0 ' +
  'L 640.0 692.0 L 642.0 689.0 L 643.0 691.0 L 642.0 689.0 L 646.0 687.0 L 646.0 685.0 ' +
  'L 650.0 686.0 L 651.0 684.0 L 650.0 685.0 L 649.0 682.0 L 651.0 681.0 L 649.0 680.0 ' +
  'L 652.0 675.0 L 653.0 677.0 L 652.0 674.0 L 660.0 667.0 L 662.0 668.0 L 661.0 666.0 ' +
  'L 663.0 665.0 L 665.0 658.0 L 671.0 652.0 L 669.0 650.0 L 672.0 647.0 L 673.0 648.0 ' +
  'L 676.0 643.0 L 679.0 643.0 L 677.0 641.0 L 684.0 637.0 L 685.0 632.0 L 724.0 656.0 ' +
  'L 734.0 667.0 L 741.0 679.0 L 745.0 693.0 L 745.0 756.0 L 740.0 772.0 L 731.0 786.0 ' +
  'L 718.0 798.0 L 568.0 900.0 L 557.0 902.0 L 547.0 899.0 L 538.0 892.0 L 538.0 883.0 ' +
  'L 540.0 881.0 L 539.0 877.0 L 542.0 876.0 L 541.0 875.0 L 548.0 868.0 L 547.0 865.0 ' +
  'L 550.0 864.0 L 549.0 861.0 L 551.0 860.0 L 553.0 862.0 L 552.0 859.0 L 555.0 857.0 ' +
  'L 557.0 858.0 L 556.0 853.0 L 558.0 851.0 L 561.0 852.0 L 565.0 847.0 L 564.0 846.0 ' +
  'L 568.0 843.0 L 567.0 841.0 L 570.0 838.0 L 572.0 839.0 L 571.0 837.0 L 576.0 831.0 ' +
  'L 577.0 832.0 L 576.0 831.0 L 579.0 828.0 L 579.0 825.0 L 590.0 813.0 L 591.0 814.0 ' +
  'L 590.0 813.0 L 592.0 811.0 L 593.0 812.0 L 592.0 811.0 L 594.0 808.0 L 599.0 808.0 ' +
  'L 598.0 807.0 L 600.0 806.0 L 645.0 836.0 L 402.0 671.0 L 403.0 801.0 L 544.0 896.0 ' +
  'L 549.0 901.0 L 609.0 940.0 L 602.0 935.0 L 602.0 928.0 L 606.0 928.0 L 605.0 925.0 ' +
  'L 611.0 922.0 L 609.0 921.0 L 612.0 920.0 L 612.0 916.0 L 614.0 915.0 L 616.0 917.0 ' +
  'L 615.0 919.0 L 617.0 919.0 L 616.0 918.0 L 619.0 918.0 L 618.0 916.0 L 620.0 914.0 ' +
  'L 623.0 916.0 L 622.0 915.0 L 625.0 913.0 L 627.0 915.0 L 626.0 913.0 L 628.0 911.0 ' +
  'L 629.0 914.0 L 632.0 909.0 L 633.0 910.0 L 634.0 908.0 L 635.0 910.0 L 646.0 902.0 ' +
  'L 649.0 904.0 L 649.0 899.0 L 653.0 900.0 L 656.0 897.0 L 663.0 899.0 L 666.0 896.0 ' +
  'L 668.0 897.0 L 667.0 898.0 L 670.0 896.0 L 673.0 898.0 L 673.0 896.0 L 677.0 896.0 ' +
  'L 678.0 893.0 L 681.0 894.0 L 681.0 897.0 L 683.0 895.0 L 687.0 895.0 L 689.0 892.0 ' +
  'L 692.0 892.0 L 695.0 895.0 L 693.0 893.0 L 695.0 891.0 L 700.0 892.0 L 704.0 890.0 ' +
  'L 705.0 892.0 L 709.0 888.0 L 710.0 890.0 L 713.0 886.0 L 715.0 888.0 L 717.0 886.0 ' +
  'L 723.0 889.0 L 721.0 891.0 L 721.0 895.0 L 720.0 894.0 L 724.0 895.0 L 732.0 890.0 ' +
  'L 734.0 891.0 L 733.0 895.0 L 716.0 906.0 L 777.0 868.0 L 828.0 834.0 L 835.0 826.0 ' +
  'L 844.0 810.0 L 849.0 788.0 L 848.0 765.0 L 842.0 745.0 L 831.0 728.0 L 820.0 717.0 ' +
  'L 505.0 513.0 L 514.0 502.0 L 592.0 451.0 L 600.0 448.0 L 613.0 449.0 L 852.0 601.0 ' +
  'L 852.0 461.0 L 849.0 455.0 L 642.0 322.0 Z';

interface HexagonShieldMarkProps {
  className?: string;
  size?: number;
  animated?: boolean;
}

export const HexagonShieldMark: React.FC<HexagonShieldMarkProps> = ({
  className = '',
  size = 130,
  animated = true,
}) => {
  const outlineRef = useRef<SVGPathElement>(null);

  useEffect(() => {
    if (!animated || !outlineRef.current) return;
    try {
      const length = outlineRef.current.getTotalLength();
      if (length > 0) {
        outlineRef.current.style.setProperty('--length', `${length}`);
        outlineRef.current.style.strokeDasharray = `${length}`;
        outlineRef.current.style.strokeDashoffset = `${length}`;
      }
    } catch {
      // Fallback
    }
  }, [animated]);

  return (
    <div
      className={`hex-shield-container ${animated ? 'animated' : 'static'} ${className}`}
      style={{
        width: size ? `${(size * 464) / 635}px` : 'auto',
        height: size ? `${size}px` : '100%',
        maxWidth: '100%',
        aspectRatio: '464 / 635',
        position: 'relative',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {animated ? (
        <div
          className="splash-mark-inner"
          style={{
            position: 'relative',
            width: '100%',
            height: '100%',
          }}
        >
          {/* 1. Vector SVG with tight viewBox (395 312 464 635) matching image bounds 1:1 */}
          <svg
            className="trace"
            viewBox="395 312 464 635"
            role="img"
            aria-label="S emblem trace"
            style={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              overflow: 'visible',
            }}
          >
            <defs>
              <linearGradient id="shield-metal-grad" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#ffffff" />
                <stop offset="48%" stopColor="#9a9a9a" />
                <stop offset="100%" stopColor="#292929" />
              </linearGradient>
            </defs>
            {/* Silhouette metallic fill */}
            <path
              className="silhouette"
              d={SHIELD_PATH}
              fill="url(#shield-metal-grad)"
            />
            {/* Outline wireframe draw */}
            <path
              ref={outlineRef}
              className="outline"
              d={SHIELD_PATH}
            />
          </svg>
          {/* 2. 3D metallic texture - opacity:0 initially, only reveals smoothly at 1.8s once vector draw & fill are complete */}
          <img
            className="logo"
            src={shieldMarkImg}
            alt="Agent S.H.I.E.L.D insignia"
            style={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              objectFit: 'contain',
              userSelect: 'none',
              pointerEvents: 'none',
            }}
          />
        </div>
      ) : (
        <img
          src={shieldMarkImg}
          alt="Agent S.H.I.E.L.D insignia"
          className="logo-static"
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'contain',
            userSelect: 'none',
            pointerEvents: 'none',
          }}
        />
      )}

      <style>{`
        .outline {
          fill: none;
          stroke: #f4f4f4;
          stroke-width: 3.2;
          stroke-linejoin: round;
          stroke-linecap: round;
          stroke-dasharray: var(--length, 3850);
          stroke-dashoffset: var(--length, 3850);
          filter: drop-shadow(0 0 6px rgba(255, 255, 255, 0.5));
          animation: shield-draw 1.35s cubic-bezier(.65, 0, .25, 1) forwards;
        }

        .silhouette {
          opacity: 0;
          animation: shield-fillIn .7s ease-out 1.28s forwards;
        }

        .logo {
          opacity: 0;
          animation: shield-revealLogo .85s ease-out 1.8s forwards;
        }

        @keyframes shield-draw {
          to { stroke-dashoffset: 0; }
        }

        @keyframes shield-fillIn {
          to { opacity: 1; }
        }

        @keyframes shield-revealLogo {
          to { opacity: 1; }
        }

        @media (prefers-reduced-motion: reduce) {
          .outline { stroke-dashoffset: 0; animation: none; }
          .silhouette, .logo { opacity: 1; animation: none; }
        }
      `}</style>
    </div>
  );
};
