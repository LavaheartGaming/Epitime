import '@testing-library/jest-dom';
import 'jest-axe/extend-expect';
import { TextEncoder, TextDecoder } from 'util';

// Mock TextEncoder/TextDecoder
global.TextEncoder = TextEncoder;
// @ts-ignore
global.TextDecoder = TextDecoder;

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: jest.fn().mockImplementation(query => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: jest.fn(),
        removeListener: jest.fn(),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn(),
    })),
});

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
    observe() { }
    unobserve() { }
    disconnect() { }
};

// Mock fetch
global.fetch = jest.fn(() =>
    Promise.resolve({
        json: () => Promise.resolve({}),
        ok: true,
        text: () => Promise.resolve(""),
    })
) as jest.Mock;

// Mock Recharts
jest.mock('recharts', () => {
    return {
        ResponsiveContainer: ({ children }: any) => children,
        BarChart: () => null,
        Bar: () => null,
        XAxis: () => null,
        YAxis: () => null,
        CartesianGrid: () => null,
        Tooltip: () => null,
    };
});

// Mock Lucide React
jest.mock('lucide-react', () => new Proxy({}, {
    get: (target, prop) => () => 'IconMock'
}));

// Mock Framer Motion
jest.mock('framer-motion', () => ({
    motion: new Proxy({}, {
        get: (target, prop) => ({ children, ...props }: any) => children
    }),
    AnimatePresence: ({ children }: any) => children,
}));
