import { useEffect, useMemo, useRef, useState } from 'react';
import type { KeyboardEvent as ReactKeyboardEvent } from 'react';
import { IconSearch, IconX } from '@tabler/icons-react';
import styles from './TitleBar.module.css';
import { filterQuickAccess, type QuickAccessItem } from './quickAccessIndex';

const PANEL_ID = 'quick-access-listbox';

export function QuickAccess({
    items,
    onSelect,
    onClose,
}: {
    items: QuickAccessItem[];
    onSelect: (item: QuickAccessItem) => void;
    onClose: () => void;
}) {
    const [query, setQuery] = useState('');
    const [activeIndex, setActiveIndex] = useState(0);
    const inputRef = useRef<HTMLInputElement>(null);
    const listRef = useRef<HTMLDivElement>(null);
    const rootRef = useRef<HTMLDivElement>(null);
    const closeRef = useRef(onClose);
    closeRef.current = onClose;

    const filtered = useMemo(
        () => filterQuickAccess(items, query),
        [items, query]
    );

    const groups = useMemo(() => {
        const map = new Map<string, QuickAccessItem[]>();
        for (const item of filtered) {
            const list = map.get(item.group);
            if (list) list.push(item);
            else map.set(item.group, [item]);
        }
        return [...map.entries()].map(([label, groupItems]) => ({
            label,
            items: groupItems,
        }));
    }, [filtered]);

    const activeIndexSafe = filtered.length
        ? Math.min(activeIndex, filtered.length - 1)
        : 0;

    useEffect(() => {
        const frame = requestAnimationFrame(() => inputRef.current?.focus());
        return () => cancelAnimationFrame(frame);
    }, []);

    useEffect(() => {
        setActiveIndex(0);
    }, [query]);

    useEffect(() => {
        const element = listRef.current?.querySelector(
            `[data-index="${activeIndexSafe}"]`
        );
        element?.scrollIntoView({ block: 'nearest' });
    }, [activeIndexSafe]);

    useEffect(() => {
        function handlePointerDown(event: MouseEvent) {
            if (
                rootRef.current &&
                !rootRef.current.contains(event.target as Node)
            ) {
                closeRef.current();
            }
        }
        document.addEventListener('mousedown', handlePointerDown);
        return () =>
            document.removeEventListener('mousedown', handlePointerDown);
    }, []);

    // Escape has to work even when focus escaped the input.
    useEffect(() => {
        function handleEscape(event: KeyboardEvent) {
            if (event.key === 'Escape') {
                event.preventDefault();
                closeRef.current();
            }
        }
        document.addEventListener('keydown', handleEscape);
        return () => document.removeEventListener('keydown', handleEscape);
    }, []);

    function handleKeyDown(event: ReactKeyboardEvent<HTMLInputElement>) {
        if (event.key === 'ArrowDown') {
            event.preventDefault();
            setActiveIndex((index) =>
                filtered.length ? (index + 1) % filtered.length : 0
            );
        } else if (event.key === 'ArrowUp') {
            event.preventDefault();
            setActiveIndex((index) =>
                filtered.length
                    ? (index - 1 + filtered.length) % filtered.length
                    : 0
            );
        } else if (event.key === 'Enter') {
            event.preventDefault();
            const item = filtered[activeIndexSafe];
            if (item) {
                onSelect(item);
                closeRef.current();
            }
        } else if (event.key === 'Escape') {
            event.preventDefault();
            closeRef.current();
        }
    }

    let globalIndex = 0;

    return (
        <div
            className={`${styles.quickAccessLayer} electrobun-webkit-app-region-no-drag`}
            ref={rootRef}
        >
            <div className={styles.quickAccessPill}>
                <IconSearch className={styles.quickAccessIcon} stroke={2} />
                <input
                    ref={inputRef}
                    className={`${styles.quickAccessInput} electrobun-webkit-app-region-no-drag`}
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Search…"
                    aria-label="Quick Access"
                    role="combobox"
                    aria-expanded={true}
                    aria-controls={PANEL_ID}
                    aria-activedescendant={
                        filtered.length
                            ? `quick-access-item-${activeIndexSafe}`
                            : undefined
                    }
                    autoComplete="off"
                    spellCheck={false}
                />
                {query && (
                    <button
                        className={`${styles.quickAccessClearBtn} electrobun-webkit-app-region-no-drag`}
                        onClick={() => {
                            setQuery('');
                            inputRef.current?.focus();
                        }}
                        title="Clear search"
                        aria-label="Clear search"
                    >
                        <IconX stroke={2} />
                    </button>
                )}
            </div>

            <div
                className={styles.quickAccessPanel}
                id={PANEL_ID}
                role="listbox"
                aria-label="Quick access results"
                ref={listRef}
            >
                {groups.length === 0 ? (
                    <div className={styles.quickAccessEmpty}>
                        {query.trim()
                            ? `No matches for “${query.trim()}”`
                            : 'Nothing to search yet'}
                    </div>
                ) : (
                    groups.map((group) => (
                        <div
                            key={group.label}
                            className={styles.quickAccessGroup}
                        >
                            <div className={styles.quickAccessGroupHeader}>
                                {group.label}
                            </div>
                            {group.items.map((item) => {
                                const index = globalIndex++;
                                const isActive = index === activeIndexSafe;
                                return (
                                    <div
                                        key={`${item.kind}-${item.id}`}
                                        id={`quick-access-item-${index}`}
                                        data-index={index}
                                        role="option"
                                        aria-selected={isActive}
                                        className={`${styles.quickAccessItem} ${
                                            isActive
                                                ? styles.quickAccessItemActive
                                                : ''
                                        }`}
                                        onClick={() => {
                                            onSelect(item);
                                            closeRef.current();
                                        }}
                                        onMouseEnter={() =>
                                            setActiveIndex(index)
                                        }
                                    >
                                        <span
                                            className={
                                                styles.quickAccessItemLabel
                                            }
                                        >
                                            {item.label}
                                        </span>
                                        {item.sublabel && (
                                            <span
                                                className={
                                                    styles.quickAccessItemSub
                                                }
                                            >
                                                {item.sublabel}
                                            </span>
                                        )}
                                        {item.badge && (
                                            <span
                                                className={
                                                    styles.quickAccessItemBadge
                                                }
                                            >
                                                {item.badge}
                                            </span>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
