/* eslint-disable react/no-children-prop */
/* eslint-disable @next/next/no-img-element */
import { SignInButton, useUser } from "@clerk/nextjs";
import { faPaperPlane } from "@fortawesome/free-regular-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { type NextPage } from "next";
import { useRef, useState } from "react";
import Markdown from "react-markdown";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { tomorrow } from "react-syntax-highlighter/dist/cjs/styles/prism";
import Sidebar from "~/components/Sidebar";
import { type Message } from "~/db/schema";
import { api } from "~/utils/api";
import { cn } from "~/utils/utils";

type StreamResult = {
  choices: {
    delta: { content: string };
  }[];
};

const Home: NextPage = () => {
  const { user } = useUser();

  const sessions = api.main.getSessions.useQuery(undefined, {
    enabled: !!user,
  });

  const [sessionId, setSessionId] = useState<number | undefined>(undefined);

  const [input, setInput] = useState<string>("");

  const [messages, setMessages] = useState<Message[]>([]);

  const createSession = api.main.createSession.useMutation();

  const getHistory = api.main.getSessionMessages.useMutation();

  const addMessage = api.main.addMessage.useMutation();

  const deleteSession = api.main.deleteSession.useMutation();

  const deleteAllSessions = api.main.deleteAllSessions.useMutation();

  const apiContext = api.useContext();

  const [isThinking, setIsThinking] = useState(false);

  const ongoingBotResponse = useRef("");

  const msgsRef = useRef<HTMLDivElement>(null);

  if (!user)
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-3 text-white">
        <span>Welcome to the ChatGPT Clone Example!</span>
        <SignInButton>
          <button className="rounded-md bg-accent p-2">Sign in</button>
        </SignInButton>
        <span className="text-center text-sm text-[#9a9ba0]">
          Built with TypeScript, Drizzle, tRPC, NextJS, OpenAI, and Vercel
        </span>
      </div>
    );

  const scrollToBottom = () => {
    if (msgsRef.current)
      msgsRef.current.scrollTop = msgsRef.current.scrollHeight;
  };

  const onSubmit = async () => {
    if (!input) return;

    setIsThinking(true);

    const question = input;

    setInput("");

    let currentSessionId = sessionId;

    // Create a new session if we don't have one
    if (!sessionId) {
      const newSession = await createSession.mutateAsync({
        question,
      });

      setSessionId(newSession.sessionId);

      currentSessionId = newSession.sessionId;

      if (newSession.message) setMessages([newSession.message]);

      await sessions.refetch();
    } else {
      setMessages((prev) => [
        ...prev,
        { role: "user", id: 0, content: question } as Message,
      ]);

      await addMessage.mutateAsync({
        content: question,
        role: "user",
        sessionId,
      });
    }

    scrollToBottom();

    if (!currentSessionId) return;

    const eventSource = new EventSource(
      `${window.location.protocol}//${window.location.host}/api/getAnswer?sessionId=${currentSessionId}`
    );

    eventSource.onerror = () => eventSource.close();

    eventSource.onmessage = async (e) => {
      console.log(e);
      if (e.data === "[DONE]") {
        eventSource.close();

        await addMessage.mutateAsync({
          content: ongoingBotResponse.current,
          sessionId: currentSessionId,
          role: "bot",
        });

        setIsThinking(false);

        ongoingBotResponse.current = "";

        return;
      }

      const data = JSON.parse(e.data as string) as StreamResult;

      const chunk = data.choices[0]?.delta.content;

      if (!chunk) return;

      ongoingBotResponse.current += chunk;

      // Add the chunk to the latest bot message
      setMessages((prev) => {
        const lastMessage = prev[prev.length - 1];

        if (lastMessage && lastMessage.role === "bot" && lastMessage.content) {
          const updatedLastMessage = {
            ...lastMessage,
            content: lastMessage.content + chunk,
          };
          return [...prev.slice(0, prev.length - 1), updatedLastMessage];
        }

        return [
          ...prev,
          {
            role: "bot",
            id: 0,
            content: chunk,
          } as Message,
        ];
      });

      scrollToBottom();
    };
  };

  const onSessionSelected = async (id: number | undefined) => {
    setSessionId(id);

    if (!id) return;

    const history = await getHistory.mutateAsync({ sessionId: id });

    setMessages(history);

    scrollToBottom();
  };

  const onDeleteSession = async (id: number) => {
    await deleteSession.mutateAsync({ sessionId: id });
    await apiContext.main.getSessions.invalidate();
    if (id == sessionId) setSessionId(undefined);
  };

  const onDeleteAllSessions = async () => {
    await deleteAllSessions.mutateAsync();
    await apiContext.main.getSessions.invalidate();
    setSessionId(undefined);
  };

  return (
    <main className="flex h-screen">
      <Sidebar
        sessions={sessions.data}
        onSessionSelected={onSessionSelected}
        onDeleteSession={onDeleteSession}
        onDeleteAllSessions={onDeleteAllSessions}
      />
      <div className="flex h-screen w-full flex-col items-center justify-between bg-[#343541] pt-4">
        {!sessionId && (
          <div className="w-1/3 rounded-md border border-gray-600 px-4 py-3">
            <p className="text-xs text-[#9a9ba0]">Model</p>
            <p className="text-sm text-white">Default (GPT-3.5)</p>
          </div>
        )}
        {!sessionId && (
          <span className="text-2xl font-bold text-[#565869]">
            ChatGPT Clone
          </span>
        )}

        {sessionId && (
          <div
            ref={msgsRef}
            className="mb-4 flex w-full grow flex-col overflow-y-auto overflow-x-hidden"
          >
            {messages.map((msg) => (
              <div
                key={`${msg.id}${msg.content ?? ""}`}
                className={cn(
                  "flex justify-center py-6",
                  msg.role == "bot" && "border-b border-[#2a2a31] bg-[#444654]"
                )}
              >
                <div className="flex w-full basis-full gap-4 px-4 sm:w-2/3 sm:basis-2/3">
                  <img
                    src={
                      msg.role === "user"
                        ? user.profileImageUrl
                        : "https://thelasttrombone.files.wordpress.com/2022/12/chatgpt_logo.jpg"
                    }
                    alt="profile picture"
                    className="h-8 w-8 rounded-sm"
                  />
                  {msg.role === "user" ? (
                    <span className="text-[#ececf1]">{msg.content}</span>
                  ) : (
                    <Markdown
                      className="grow text-[#ececf1]"
                      components={{
                        code({ inline, className, children, ...props }) {
                          const match = /language-(\w+)/.exec(className || "");

                          return !inline && match ? (
                            <SyntaxHighlighter
                              // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-explicit-any
                              style={tomorrow as any}
                              PreTag="div"
                              language={match[1]}
                              children={String(children).replace(/\n$/, "")}
                              {...props}
                            />
                          ) : (
                            <code
                              className={className ? className : ""}
                              {...props}
                            >
                              {children}
                            </code>
                          );
                        },
                      }}
                    >
                      {msg.content ?? ""}
                    </Markdown>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
        <div className="flex w-full flex-col items-center justify-center gap-2 px-4 pb-4">
          <div className="flex w-full items-center rounded-md bg-[#40414f] px-4 py-3 text-white outline-none drop-shadow-lg sm:w-2/3">
            <input
              className="flex-grow bg-transparent outline-none"
              placeholder="Send a message..."
              value={input}
              maxLength={420}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={async (e) => {
                if (e.key === "Enter" && !isThinking) await onSubmit();
              }}
            />
            <FontAwesomeIcon
              icon={faPaperPlane}
              className="h-4 w-4 cursor-pointer text-[#9a9ba0]"
            />
          </div>
          <span className="text-center text-sm text-[#9a9ba0]">
            Built with TypeScript,{" "}
            <a
              href="https://github.com/drizzle-team/drizzle-orm"
              target="_blank"
              className="hover:underline"
            >
              Drizzle
            </a>
            ,{" "}
            <a
              href="https://trpc.io/"
              target="_blank"
              className="hover:underline"
            >
              tRPC
            </a>
            ,{" "}
            <a
              href="https://nextjs.org/"
              target="_blank"
              className="hover:underline"
            >
              NextJS
            </a>
            ,{" "}
            <a
              href="https://platform.openai.com/docs/guides/chat"
              target="_blank"
              className="hover:underline"
            >
              OpenAI
            </a>
            , and{" "}
            <a
              href="https://vercel.com"
              target="_blank"
              className="hover:underline"
            >
              Vercel
            </a>
          </span>
        </div>
      </div>
    </main>
  );
};

export default Home;
