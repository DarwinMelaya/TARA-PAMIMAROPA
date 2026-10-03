import dostLogo from '../../pic/mimaropalogo.png';

type Props = {
    /** Renders the white wordmark dark so it stays legible on light surfaces. */
    onLight?: boolean;
    className?: string;
};

export default function DostLogo({ onLight = false, className = '' }: Props) {
    return (
        <span className={`relative inline-block shrink-0 ${className}`}>
            <img
                src={dostLogo}
                alt=""
                className={`block h-full w-auto ${
                    onLight
                        ? // Seal occupies the left 15% of the PNG; only the wordmark is inverted.
                          '[filter:invert(1)_hue-rotate(180deg)] [clip-path:inset(0_0_0_15%)]'
                        : ''
                }`}
            />
            {onLight ? (
                <img
                    src={dostLogo}
                    alt=""
                    aria-hidden
                    className="absolute inset-0 h-full w-full [clip-path:inset(0_85%_0_0)]"
                />
            ) : null}
        </span>
    );
}
