import { SignOutButton } from "@clerk/nextjs";
import { type IconProp } from "@fortawesome/fontawesome-svg-core";
import { faGithub } from "@fortawesome/free-brands-svg-icons";
import {
  faMessage,
  faTrashAlt,
  faTrashCan,
} from "@fortawesome/free-regular-svg-icons";
import {
  faArrowRightFromBracket,
  faPlus,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { type RouterOutputs } from "~/utils/api";

const MenuItem = ({ icon, text }: { icon: IconProp; text: string }) => (
  <div className="flex cursor-pointer items-center gap-2 rounded-md px-4 py-3 hover:bg-gray-600">
    <FontAwesomeIcon icon={icon} className="h-4 w-4" />
    <span>{text}</span>
  </div>
);

const SessionItem = ({
  text,
  sessionId,
  onClick,
  onDelete,
}: {
  text: string;
  sessionId: number;
  onClick: (sessionId: number) => void;
  onDelete: (sessionId: number) => void;
}) => (
  <div className="group/item flex cursor-pointer items-center gap-2 rounded-md px-4 py-3 hover:bg-gray-600">
    <FontAwesomeIcon
      icon={faMessage}
      className="h-4 w-4"
      onClick={() => onClick(sessionId)}
    />
    <div className="w-5/6 overflow-hidden" onClick={() => onClick(sessionId)}>
      <span className="whitespace-nowrap">{text}</span>
    </div>
    <FontAwesomeIcon
      icon={faTrashAlt}
      className="right-0 h-4 w-4 opacity-0 group-hover/item:opacity-100"
      onClick={() => onDelete(sessionId)}
    />
  </div>
);

const Sidebar = ({
  sessions,
  onSessionSelected,
  onDeleteSession,
  onDeleteAllSessions,
}: {
  sessions: RouterOutputs["main"]["getSessions"] | undefined;
  onSessionSelected: (sessionId: number | undefined) => void;
  onDeleteSession: (sessionId: number) => void;
  onDeleteAllSessions: () => void;
}) => {
  return (
    <div className="hidden h-full min-w-[260px] max-w-[260px] flex-col gap-2 bg-[#202123] p-4 text-sm text-[#f8f8f8] sm:flex">
      <div
        onClick={() => onSessionSelected(undefined)}
        className="flex cursor-pointer items-center gap-2 rounded-md border border-gray-600 px-4 py-3 hover:bg-gray-600"
      >
        <FontAwesomeIcon icon={faPlus} className="h-4 w-4" />
        <span>New chat</span>
      </div>

      <div className="flex-grow overflow-y-auto border-b border-gray-600">
        {sessions?.map((session) => (
          <SessionItem
            key={session.id}
            text={session.name}
            sessionId={session.id}
            onClick={() => onSessionSelected(session.id)}
            onDelete={onDeleteSession}
          />
        ))}
      </div>

      <div className="flex flex-col gap-2">
        <div onClick={onDeleteAllSessions}>
          <MenuItem icon={faTrashCan} text="Clear converstations" />
        </div>
        <a
          href="https://github.com/WilliamWelsh/chatgpt-clone"
          target="_blank"
          rel="noreferrer"
        >
          <MenuItem icon={faGithub} text="GitHub" />
        </a>
        <div className="flex cursor-pointer items-center gap-2 rounded-md px-4 py-3 hover:bg-gray-600">
          <FontAwesomeIcon icon={faArrowRightFromBracket} className="h-4 w-4" />
          <SignOutButton />
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
