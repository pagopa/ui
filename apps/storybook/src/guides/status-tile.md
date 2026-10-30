`StatusTile` is an article with `orientation="horizontal"` (channel and title on
the left, tag on the right) or `orientation="vertical"` (tag stacked under the
channel/title row). `channel` is the artwork slot beside the title, `tag` a
caller-owned `Tag`, `title` the heading and `children` the body. A caller may
pass `className` to size the outer column.

The channel is decoration: the component hides its wrapper from assistive
technology and the caller supplies the meaningful title. The tag keeps its own
semantics. Every rendered string is consumer-owned; there is no built-in copy.
