import styles from "../App.module.css";
import { Electroview } from "electrobun/view";
import { useState, useEffect, useMemo } from "react";
import { useRPC } from "../contexts/RPCContext";
import {
	IconBook2,
	IconFolder,
	IconLayoutSidebar,
	IconLayoutSidebarFilled,
	IconLayoutSidebarRight,
	IconLayoutSidebarRightFilled,
	IconMinus,
	IconSettings,
	IconSquare,
	IconSquares,
	IconTimelineEventText,
	IconX,
} from "@tabler/icons-react";

export function TitleBar({
	isCollapsed,
	isChatCollapsed,
	setIsCollapsed,
	setIsChatCollapsed,
	onProjectsClick,
	onSettingsClick,
	onProjectManagerClick,
	onTimelineClick,
	projectName,
	extras,
}: {
	isCollapsed: boolean;
	isChatCollapsed: boolean;
	setIsCollapsed: (isCollapsed: boolean) => void;
	setIsChatCollapsed: (isChatCollapsed: boolean) => void;
	onProjectsClick: () => void;
	onSettingsClick: () => void;
	onProjectManagerClick: () => void;
	onTimelineClick: () => void;
	projectName: string | null;
	extras?: React.ReactNode;
}) {
	const rpc = useRPC();
	const eb = useMemo(() => new Electroview({ rpc }), [rpc]);

	const [isMaximized, setIsMaximized] = useState(false);

	useEffect(() => {
		// Change 'isMax: boolean' to '{ params: boolean }'
		rpc.addMessageListener("window-state-changed", (payload) => {
			const isMax = payload.valueOf();
			setIsMaximized(isMax);
		});

		(async () => {
			const maximized = await rpc.request["window:is-maximized"]();
			setIsMaximized(maximized);
		})();
	}, []);

	return (
		<>
			<div className={`${styles.titleBar} electrobun-webkit-app-region-drag`}>
				<div
					className={`${styles.applicationMenu} electrobun-webkit-app-region-no-drag`}
				>
					<button className={styles.appIconBtn}>
						<svg
							xmlns="http://www.w3.org/2000/svg"
							viewBox="0 0 48 48"
							width={24}
							height={24}
						>
							<rect width="48" height="48" rx="12" fill="#292931" />
							<g
								stroke="#d4a853"
								strokeWidth="3"
								strokeLinecap="round"
								strokeLinejoin="round"
								fill="none"
							>
								<path d="M24 35h12" />
								<path d="M30 11a4.242 4.242 0 0 1 6 6L14 34l-6 2 2-6L30 11z" />
							</g>
						</svg>
					</button>
					<div className="app-menu-items">
						<button className="app-menu-item">File</button>
						<button className="app-menu-item">Edit</button>
						<button className="app-menu-item">View</button>
						<button className="app-menu-item">Help</button>
					</div>
				</div>
				<div className="application-title electrobun-webkit-app-region-no-drag">
					{projectName || "Novelty"}
				</div>
				<div className="title-bar-left electrobun-webkit-app-region-no-drag" style={{ display: "flex"}}>
					{extras && (
						<div className="title-bar-extras">{extras}</div>
					)}
					<div
						className={styles.leftButtons}
						style={{
							display: "inline-block",
							marginRight: "16px",
						}}
					>
						<button
							className={`${styles.iconBtn}`}
							onClick={() => setIsCollapsed(!isCollapsed)}
							title={`${isCollapsed ? "Open" : "Close"} Explorer`}
						>
							{isCollapsed ? (
								<IconLayoutSidebar stroke={2} />
							) : (
								<IconLayoutSidebarFilled />
							)}
						</button>
						<button
							className={`${styles.iconBtn}`}
							onClick={() => setIsChatCollapsed(!isChatCollapsed)}
							title={`${isChatCollapsed ? "Open" : "Close"} Chat`}
						>
							{isChatCollapsed ? (
								<IconLayoutSidebarRight stroke={2} />
							) : (
								<IconLayoutSidebarRightFilled />
							)}
						</button>
						<button className={`${styles.iconBtn}`} onClick={onTimelineClick} title="Timeline">
							<IconTimelineEventText stroke={2} />
						</button>
						<button
							className={`${styles.iconBtn}`}
							onClick={onProjectManagerClick}
							title="Project Manager"
						>
							<IconBook2 stroke={2} />
						</button>
						<button
							className={`${styles.iconBtn}`}
							onClick={onProjectsClick}
							title="Open Projects"
						>
							<IconFolder stroke={2} />
						</button>
						<button
							className={`${styles.iconBtn}`}
							onClick={onSettingsClick}
							title="Open settings"
						>
							<IconSettings stroke={2} />
						</button>
					</div>
					<div
						className={styles.windowControls}
						style={{
							display: "inline-block",
						}}
					>
						<button
							className={`${styles.iconBtn}`}
							onClick={() => {
								console.log("minimize clicked");
								(eb.rpc?.send as any)["minimize-window"]();
							}}
							title="Minimize"
						>
							<IconMinus stroke={2} />
						</button>
						<button
							className={`${styles.iconBtn}`}
							onClick={() => {
								console.log("maximize clicked");
								(eb.rpc?.send as any)["maximize-window"]();
							}}
							title={isMaximized ? "Restore" : "Maximize"}
						>
							{isMaximized ? (
								<IconSquares stroke={2} />
							) : (
								<IconSquare stroke={2} />
							)}
						</button>
						<button
							className={`${styles.iconBtn}`}
							onClick={() => (eb.rpc?.send as any)["close-window"]()}
							title="Close"
						>
							<IconX stroke={2} />
						</button>
					</div>
				</div>
				{/*<button>user</button>*/}
			</div>
		</>
	);
}
