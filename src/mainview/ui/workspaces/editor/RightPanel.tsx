
type Props = {
    isChatCollapsed: boolean
}

export default function RightPanel({ isChatCollapsed }: Props) {
    return (
        <aside className={`app-panel app-panel-right ${isChatCollapsed ? "collapsed" : ""}`}>RightPanel</aside>
    )
}